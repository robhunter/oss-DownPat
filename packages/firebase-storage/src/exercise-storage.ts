import type { Firestore } from 'firebase-admin/firestore';
import type { Exercise, ExerciseMetadata, ExerciseStorage } from '@downpat/core';

/**
 * Firebase implementation of ExerciseStorage.
 *
 * Data structure (single-org, no orgId needed):
 * - exercises/{exerciseId} - Exercise documents
 * - exerciseMetadata/{slug} - Maps slug to draft/published exercise IDs
 */
export class FirebaseExerciseStorage implements ExerciseStorage {
  private exercisesCollection: string = 'exercises';
  private metadataCollection: string = 'exerciseMetadata';

  constructor(private db: Firestore) {}

  async getExercise(exerciseId: string): Promise<Exercise | null> {
    const doc = await this.db.collection(this.exercisesCollection).doc(exerciseId).get();
    return doc.exists ? (doc.data() as Exercise) : null;
  }

  async getExerciseBySlug(slug: string, publishedOnly = false): Promise<Exercise | null> {
    const metadata = await this.getExerciseMetadata(slug);
    if (!metadata) {
      return null;
    }

    const exerciseId = publishedOnly ? metadata.published : metadata.draft;
    if (!exerciseId) {
      return null;
    }

    return this.getExercise(exerciseId);
  }

  async createExercise(exercise: Exercise): Promise<void> {
    const exerciseRef = this.db.collection(this.exercisesCollection).doc(exercise.exerciseId);
    const metadataRef = this.db.collection(this.metadataCollection).doc(exercise.slug);

    await this.db.runTransaction(async (txn) => {
      // Check if slug already exists
      const existingMetadata = await txn.get(metadataRef);
      if (existingMetadata.exists) {
        throw new Error(`Exercise with slug "${exercise.slug}" already exists`);
      }

      // Create exercise document
      txn.create(exerciseRef, {
        ...exercise,
        createdAt: new Date().toISOString(),
      });

      // Create metadata document
      txn.create(metadataRef, {
        draft: exercise.exerciseId,
        // published: undefined (not published yet)
      } as ExerciseMetadata);
    });
  }

  async updateExercise(exercise: Exercise): Promise<void> {
    await this.db
      .collection(this.exercisesCollection)
      .doc(exercise.exerciseId)
      .set(
        {
          ...exercise,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
  }

  async publishExercise(slug: string): Promise<void> {
    const metadataRef = this.db.collection(this.metadataCollection).doc(slug);

    await this.db.runTransaction(async (txn) => {
      const metadataDoc = await txn.get(metadataRef);
      const metadata = metadataDoc.data() as ExerciseMetadata | undefined;

      if (!metadata) {
        throw new Error('Exercise not found');
      }

      // Copy draft to published document
      const draftRef = this.db.collection(this.exercisesCollection).doc(metadata.draft);
      const draftDoc = await txn.get(draftRef);

      if (!draftDoc.exists) {
        throw new Error('Draft exercise not found');
      }

      // Create new published document (or update existing)
      const publishedId = metadata.published || `${metadata.draft}-published`;
      const publishedRef = this.db.collection(this.exercisesCollection).doc(publishedId);

      const draftData = draftDoc.data()!;
      txn.set(publishedRef, {
        ...draftData,
        exerciseId: publishedId,
        publishedAt: new Date().toISOString(),
      });

      // Update metadata
      txn.update(metadataRef, {
        draft: metadata.draft,
        published: publishedId,
      });
    });
  }

  async unpublishExercise(slug: string): Promise<void> {
    const metadataRef = this.db.collection(this.metadataCollection).doc(slug);

    await this.db.runTransaction(async (txn) => {
      const metadataDoc = await txn.get(metadataRef);
      const metadata = metadataDoc.data() as ExerciseMetadata | undefined;

      if (!metadata) {
        throw new Error('Exercise not found');
      }

      if (!metadata.published) {
        throw new Error('Exercise is not published');
      }

      // Remove published document
      const publishedRef = this.db.collection(this.exercisesCollection).doc(metadata.published);
      txn.delete(publishedRef);

      // Update metadata (remove published reference, keep draft)
      txn.update(metadataRef, {
        draft: metadata.draft,
        published: null,
      });
    });
  }

  async restoreFromPublished(slug: string): Promise<void> {
    const metadataRef = this.db.collection(this.metadataCollection).doc(slug);

    await this.db.runTransaction(async (txn) => {
      const metadataDoc = await txn.get(metadataRef);
      const metadata = metadataDoc.data() as ExerciseMetadata | undefined;

      if (!metadata?.published) {
        throw new Error('No published version to restore from');
      }

      // Copy published data to draft
      const publishedRef = this.db.collection(this.exercisesCollection).doc(metadata.published);
      const publishedDoc = await txn.get(publishedRef);

      if (!publishedDoc.exists) {
        throw new Error('Published exercise not found');
      }

      const draftRef = this.db.collection(this.exercisesCollection).doc(metadata.draft);
      const publishedData = publishedDoc.data()!;

      txn.set(draftRef, {
        ...publishedData,
        exerciseId: metadata.draft,
        restoredAt: new Date().toISOString(),
      });
    });
  }

  async getExerciseMetadata(slug: string): Promise<ExerciseMetadata | null> {
    const doc = await this.db.collection(this.metadataCollection).doc(slug).get();
    return doc.exists ? (doc.data() as ExerciseMetadata) : null;
  }

  async getExercises(): Promise<Exercise[]> {
    // Get all metadata to find draft IDs
    const metadataSnapshot = await this.db.collection(this.metadataCollection).get();
    const draftIds = metadataSnapshot.docs.map((doc) => doc.data().draft as string);

    if (draftIds.length === 0) {
      return [];
    }

    // Fetch all draft exercises
    const exerciseRefs = draftIds.map((id) =>
      this.db.collection(this.exercisesCollection).doc(id)
    );
    const exerciseDocs = await this.db.getAll(...exerciseRefs);

    return exerciseDocs.filter((doc) => doc.exists).map((doc) => doc.data() as Exercise);
  }

  async getExercisesWithMetadata(): Promise<Array<{ exercise: Exercise; metadata: ExerciseMetadata }>> {
    // Get all metadata
    const metadataSnapshot = await this.db.collection(this.metadataCollection).get();

    if (metadataSnapshot.empty) {
      return [];
    }

    const result: Array<{ exercise: Exercise; metadata: ExerciseMetadata }> = [];

    // Fetch draft exercises for each metadata entry
    const draftIds = metadataSnapshot.docs.map((doc) => doc.data().draft as string);
    const exerciseRefs = draftIds.map((id) =>
      this.db.collection(this.exercisesCollection).doc(id)
    );
    const exerciseDocs = await this.db.getAll(...exerciseRefs);

    metadataSnapshot.docs.forEach((metaDoc, index) => {
      const exerciseDoc = exerciseDocs[index];
      if (exerciseDoc.exists) {
        result.push({
          exercise: exerciseDoc.data() as Exercise,
          metadata: metaDoc.data() as ExerciseMetadata,
        });
      }
    });

    return result;
  }

  async getPublishedExercises(): Promise<Exercise[]> {
    // Get all metadata to find published IDs
    const metadataSnapshot = await this.db.collection(this.metadataCollection).get();
    const publishedIds = metadataSnapshot.docs
      .map((doc) => doc.data().published as string | undefined)
      .filter((id): id is string => !!id);

    if (publishedIds.length === 0) {
      return [];
    }

    // Fetch all published exercises
    const exerciseRefs = publishedIds.map((id) =>
      this.db.collection(this.exercisesCollection).doc(id)
    );
    const exerciseDocs = await this.db.getAll(...exerciseRefs);

    return exerciseDocs.filter((doc) => doc.exists).map((doc) => doc.data() as Exercise);
  }

  async deleteExercise(slug: string): Promise<void> {
    const metadataRef = this.db.collection(this.metadataCollection).doc(slug);

    await this.db.runTransaction(async (txn) => {
      const metadataDoc = await txn.get(metadataRef);
      const metadata = metadataDoc.data() as ExerciseMetadata | undefined;

      if (!metadata) {
        throw new Error('Exercise not found');
      }

      // Delete draft exercise
      const draftRef = this.db.collection(this.exercisesCollection).doc(metadata.draft);
      txn.delete(draftRef);

      // Delete published exercise if exists
      if (metadata.published) {
        const publishedRef = this.db.collection(this.exercisesCollection).doc(metadata.published);
        txn.delete(publishedRef);
      }

      // Delete metadata
      txn.delete(metadataRef);
    });
  }
}
