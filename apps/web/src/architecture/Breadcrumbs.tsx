import type { ArchitectureView } from "./state";

export interface ArchitectureBreadcrumb {
  readonly view: ArchitectureView;
  readonly label: string;
}

export interface ArchitectureBreadcrumbsProps {
  readonly items: readonly ArchitectureBreadcrumb[];
  readonly currentView: ArchitectureView;
  readonly onNavigate: (view: ArchitectureView) => void;
}

export function ArchitectureBreadcrumbs({
  items,
  currentView,
  onNavigate,
}: ArchitectureBreadcrumbsProps) {
  return (
    <nav aria-label="Architecture breadcrumb">
      <ol>
        {items.map((item) => (
          <li key={item.view}>
            {item.view === currentView ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <button type="button" onClick={() => onNavigate(item.view)}>
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
