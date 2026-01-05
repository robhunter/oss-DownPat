// Components
export { Avatar } from './components/Avatar.js';
export type { AvatarProps } from './components/Avatar.js';

export { Message } from './components/Message.js';
export type { MessageProps, MessageData } from './components/Message.js';

export { MessageList } from './components/MessageList.js';
export type { MessageListProps } from './components/MessageList.js';

export { TalkToCoachSidebar } from './components/TalkToCoachSidebar.js';
export type { TalkToCoachSidebarProps } from './components/TalkToCoachSidebar.js';

// Theme
export {
  generateTheme,
  applyTheme,
  type ThemeColors,
  type ThemeOptions,
  type GeneratedTheme,
} from './theme/index.js';

// Re-export useful types from core
export { MessageType, VISIBLE_MESSAGE_TYPES } from '@downpat/core';
