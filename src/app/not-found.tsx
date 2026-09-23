import { EmptyState } from '@/components/ui';

// Used for anything the viewer may not see as well as things that don't exist:
// telling them apart would confirm that another brand's reply exists.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg pt-12">
      <EmptyState title="Nothing here for you" action={{ href: '/', label: 'Back to your start page' }}>
        It doesn&apos;t exist, or it belongs to a brand or person you don&apos;t have access to.
      </EmptyState>
    </div>
  );
}
