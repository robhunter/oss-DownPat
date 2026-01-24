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

    if (publishedOnly) {
      return metadata.published ? this.getExercise(metadata.published) : null;
    }

    // Return draft if exists, otherwise published (for editing published-only exercises)
    const exerciseId = metadata.draft || metadata.published;
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

      // Create exercise document as draft
      txn.create(exerciseRef, {
        ...exercise,
        status: 'draft',
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
    const metadataRef = this.db.collection(this.metadataCollection).doc(exercise.slug);

    await this.db.runTransaction(async (txn) => {
      const metadataDoc = await txn.get(metadataRef);
      const metadata = metadataDoc.data() as ExerciseMetadata | undefined;

      // If updating a published-only exercise, create a draft first
      if (metadata && !metadata.draft && metadata.published === exercise.exerciseId) {
        // Create new draft from the updated data
        const draftId = metadata.published.replace(/-published$/, '');
        const draftRef = this.db.collection(this.exercisesCollection).doc(draftId);

        txn.set(draftRef, {
          ...exercise,
          exerciseId: draftId,
          status: 'draft',
          updatedAt: new Date().toISOString(),
        });
        txn.set(metadataRef, { ...metadata, draft: draftId });
      } else {
        // Normal update - just update the document
        const exerciseRef = this.db.collection(this.exercisesCollection).doc(exercise.exerciseId);
        txn.set(
          exerciseRef,
          {
            ...exercise,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    });
  }

  async publishExercise(slug: string): Promise<void> {
    const metadataRef = this.db.collection(this.metadataCollection).doc(slug);

    await this.db.runTransaction(async (txn) => {
      const metadataDoc = await txn.get(metadataRef);
      const metadata = metadataDoc.data() as ExerciseMetadata | undefined;

      if (!metadata) {
        throw new Error('Exercise not found');
      }

      if (!metadata.draft) {
        throw new Error('No draft to publish');
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

      // Copy draft data, set published status and timestamp
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { publishedAt: _stripped, ...draftData } = draftDoc.data()!;
      txn.set(publishedRef, {
        ...draftData,
        exerciseId: publishedId,
        status: 'published',
        publishedAt: new Date().toISOString(),
      });

      // Delete draft and update metadata to only have published
      txn.delete(draftRef);
      txn.set(metadataRef, {
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

      // Get published document data
      const publishedRef = this.db.collection(this.exercisesCollection).doc(metadata.published);
      const publishedDoc = await txn.get(publishedRef);

      if (!publishedDoc.exists) {
        throw new Error('Published exercise not found');
      }

      // Convert published to draft - strip publishedAt since drafts shouldn't have it
      const draftId = metadata.published.replace(/-published$/, '');
      const draftRef = this.db.collection(this.exercisesCollection).doc(draftId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { publishedAt: _stripped, ...publishedData } = publishedDoc.data()!;

      txn.set(draftRef, {
        ...publishedData,
        exerciseId: draftId,
        status: 'draft',
      });

      // Delete published and update metadata
      txn.delete(publishedRef);
      txn.set(metadataRef, {
        draft: draftId,
      });
    });
  }

  async restoreFromPublished(slug: string): Promise<void> {
    const metadataRef = this.db.collection(this.metadataCollection).doc(slug);

    await this.db.runTransaction(async (txn) => {
      const metadataDoc = await txn.get(metadataRef);
      const metadata = metadataDoc.data() as ExerciseMetadata | undefined;

      if (!metadata?.published) {
        throw new Error('No published version');
      }

      if (!metadata.draft) {
        throw new Error('No draft to restore from');
      }

      // Simply delete the draft - published remains
      const draftRef = this.db.collection(this.exercisesCollection).doc(metadata.draft);
      txn.delete(draftRef);

      // Update metadata to only have published
      txn.set(metadataRef, {
        published: metadata.published,
      });
    });
  }

  async createDraftFromPublished(slug: string): Promise<void> {
    const metadataRef = this.db.collection(this.metadataCollection).doc(slug);

    await this.db.runTransaction(async (txn) => {
      const metadataDoc = await txn.get(metadataRef);
      const metadata = metadataDoc.data() as ExerciseMetadata | undefined;

      if (!metadata?.published) {
        throw new Error('No published version');
      }

      if (metadata.draft) {
        throw new Error('Draft already exists');
      }

      // Get published document data
      const publishedRef = this.db.collection(this.exercisesCollection).doc(metadata.published);
      const publishedDoc = await txn.get(publishedRef);

      if (!publishedDoc.exists) {
        throw new Error('Published exercise not found');
      }

      // Create draft from published - strip publishedAt since drafts shouldn't have it
      const draftId = metadata.published.replace(/-published$/, '');
      const draftRef = this.db.collection(this.exercisesCollection).doc(draftId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { publishedAt: _stripped, ...publishedData } = publishedDoc.data()!;

      txn.set(draftRef, {
        ...publishedData,
        exerciseId: draftId,
        status: 'draft',
      });

      // Update metadata to have both draft and published
      txn.update(metadataRef, {
        draft: draftId,
      });
    });
  }

  async getExerciseMetadata(slug: string): Promise<ExerciseMetadata | null> {
    const doc = await this.db.collection(this.metadataCollection).doc(slug).get();
    return doc.exists ? (doc.data() as ExerciseMetadata) : null;
  }

  async getExercises(): Promise<Exercise[]> {
    // Get all metadata to find editable exercise IDs (draft if exists, otherwise published)
    const metadataSnapshot = await this.db.collection(this.metadataCollection).get();

    if (metadataSnapshot.empty) {
      return [];
    }

    // Get the "editable" ID for each exercise (draft if exists, otherwise published)
    const exerciseIds = metadataSnapshot.docs
      .map((doc) => {
        const data = doc.data() as ExerciseMetadata;
        return data.draft || data.published;
      })
      .filter((id): id is string => !!id);

    if (exerciseIds.length === 0) {
      return [];
    }

    // Fetch all exercises
    const exerciseRefs = exerciseIds.map((id) =>
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

    // Get the "editable" ID for each exercise (draft if exists, otherwise published)
    const exerciseIds = metadataSnapshot.docs.map((doc) => {
      const data = doc.data() as ExerciseMetadata;
      return data.draft || data.published;
    });

    const exerciseRefs = exerciseIds
      .filter((id): id is string => !!id)
      .map((id) => this.db.collection(this.exercisesCollection).doc(id));

    if (exerciseRefs.length === 0) {
      return [];
    }

    const exerciseDocs = await this.db.getAll(...exerciseRefs);

    let exerciseIndex = 0;
    metadataSnapshot.docs.forEach((metaDoc) => {
      const metadata = metaDoc.data() as ExerciseMetadata;
      if (metadata.draft || metadata.published) {
        const exerciseDoc = exerciseDocs[exerciseIndex];
        if (exerciseDoc.exists) {
          result.push({
            exercise: exerciseDoc.data() as Exercise,
            metadata,
          });
        }
        exerciseIndex++;
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

      // Delete draft exercise if exists
      if (metadata.draft) {
        const draftRef = this.db.collection(this.exercisesCollection).doc(metadata.draft);
        txn.delete(draftRef);
      }

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
