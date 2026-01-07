import { z } from 'zod';
import { MessageType } from '../constants/message-types.js';

// ============================================
// Message Type Schema
// ============================================

export const MessageTypeSchema = z.nativeEnum(MessageType);

// ============================================
// User Schema
// ============================================

export const UserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  displayName: z.string().min(1, 'Display name is required'),
  isAdmin: z.boolean(),
  isSubscriber: z.boolean(),
  isDemo: z.boolean().optional(),
});

export type UserInput = z.infer<typeof UserSchema>;

// ============================================
// Message Schemas
// ============================================

export const MessageSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
  type: MessageTypeSchema,
  role: z.string().min(1, 'Role is required'),
  content: z.string(),
  timestamp: z.string().datetime({ message: 'Invalid timestamp format' }),
  taskId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type MessageInput = z.infer<typeof MessageSchema>;

export const AddMessageInputSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  type: MessageTypeSchema,
  role: z.string().min(1, 'Role is required'),
  content: z.string(),
  taskId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================
// Conversation Schemas
// ============================================

export const ConversationSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  exerciseId: z.string().min(1, 'Exercise ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  messages: z.array(MessageSchema),
  createdAt: z.string().datetime({ message: 'Invalid createdAt format' }),
  updatedAt: z.string().datetime({ message: 'Invalid updatedAt format' }).optional(),
  isComplete: z.boolean(),
  userMessageCount: z.number().int().min(0),
});

export type ConversationInput = z.infer<typeof ConversationSchema>;

export const CreateConversationInputSchema = z.object({
  exerciseId: z.string().min(1, 'Exercise ID is required'),
  userId: z.string().min(1, 'User ID is required'),
});

// ============================================
// Task Schemas
// ============================================

export const MessageFilterSchema = z.object({
  includeTypes: z.array(MessageTypeSchema).optional(),
  excludeTypes: z.array(MessageTypeSchema).optional(),
  maxMessages: z.number().int().positive().optional(),
});

export const BaseTaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  name: z.string().min(1, 'Task name is required'),
  responseType: MessageTypeSchema,
  role: z.string().min(1, 'Role is required'),
  prompt: z.string(),
  messageFilter: MessageFilterSchema.optional(),
  enabled: z.boolean(),
});

export const ConversationTaskSchema = BaseTaskSchema.extend({
  responseType: z.literal(MessageType.CONVERSATION),
});

export const CommentaryTaskSchema = BaseTaskSchema.extend({
  responseType: z.literal(MessageType.COMMENTARY),
});

export const SummaryTaskSchema = BaseTaskSchema.extend({
  responseType: z.literal(MessageType.SUMMARY),
});

export const SimpleTaskSchema = BaseTaskSchema.extend({
  responseType: z.literal(MessageType.SIMPLE),
});

export const TaskSchema = z.discriminatedUnion('responseType', [
  ConversationTaskSchema,
  CommentaryTaskSchema,
  SummaryTaskSchema,
  SimpleTaskSchema,
]);

export type TaskInput = z.infer<typeof TaskSchema>;

// ============================================
// Starter Schema
// ============================================

export const StarterSchema = z.object({
  text: z.string().min(1, 'Starter text is required'),
  context: z.string(),
  attributes: z.record(z.string(), z.string()),
});

export type StarterInput = z.infer<typeof StarterSchema>;

// ============================================
// Exercise Schemas
// ============================================

export const ExerciseStatusSchema = z.enum(['draft', 'published']);

export const ExerciseMetadataSchema = z.object({
  draft: z.string().min(1, 'Draft ID is required'),
  published: z.string().optional(),
});

export const ExerciseSchema = z.object({
  exerciseId: z.string().min(1, 'Exercise ID is required'),
  exerciseName: z.string().min(1, 'Exercise name is required'),
  slug: z.string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  maxUserMessages: z.number().int().positive('Max user messages must be positive'),
  model: z.string().min(1, 'Model is required'),
  talkToCoachEnabled: z.boolean(),
  continuationTasks: z.array(TaskSchema),
  completionTasks: z.array(TaskSchema),
  welcomeMessage: z.string(),
  guidelines: z.string(),
  starters: z.array(StarterSchema),
  status: ExerciseStatusSchema.optional(),
  priority: z.number().int().optional(),
  createdAt: z.string().datetime({ message: 'Invalid createdAt format' }).optional(),
  updatedAt: z.string().datetime({ message: 'Invalid updatedAt format' }).optional(),
});

export type ExerciseInput = z.infer<typeof ExerciseSchema>;

export const CreateExerciseInputSchema = ExerciseSchema.omit({
  exerciseId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  exerciseId: z.string().optional(),
});

export const UpdateExerciseInputSchema = ExerciseSchema.partial().extend({
  exerciseId: z.string().min(1, 'Exercise ID is required'),
});

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate data against a schema and return typed result.
 * Throws ZodError if validation fails.
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safely validate data against a schema.
 * Returns { success: true, data: T } or { success: false, error: ZodError }.
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  return schema.safeParse(data);
}
