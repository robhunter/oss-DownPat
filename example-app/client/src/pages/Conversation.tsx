import { useParams, useNavigate } from 'react-router-dom';
import { ConversationPage } from '@downpat/ui-components';

interface ConversationProps {
  isAdminTest?: boolean;
}

/**
 * =============================================================================
 * MOVE TO: @downpat/react (route config handles this entirely)
 *
 * This thin wrapper will be eliminated when createDownpatRoutes() is implemented.
 * The route config will:
 * - Extract slug from URL params
 * - Provide correct onBack callback with basePath-aware navigation
 * - Pass isAdminTest based on which route matched
 *
 * TODO: Paths will become /downpat/admin/exercises and /downpat/exercises
 * =============================================================================
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
