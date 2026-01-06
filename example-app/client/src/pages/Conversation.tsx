import { useParams, useNavigate } from 'react-router-dom';
import { ConversationPage } from '@downpat/ui-components';

interface ConversationProps {
  isAdminTest?: boolean;
}

/**
 * Thin wrapper around ConversationPage from @downpat/ui-components.
 * Handles routing via react-router.
 */
export function Conversation({ isAdminTest = false }: ConversationProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const backPath = isAdminTest ? '/admin/exercises' : '/exercises';
  const backText = isAdminTest ? '← Back to Admin' : '← Back to Exercises';

  const handleBack = () => {
    navigate(backPath);
  };

  return (
    <div style={{ height: 'calc(100vh - 112px)', marginLeft: '-20px', marginRight: '-20px' }}>
      <ConversationPage
        slug={slug || ''}
        onBack={handleBack}
        backText={backText}
        isAdminTest={isAdminTest}
      />
    </div>
  );
}
