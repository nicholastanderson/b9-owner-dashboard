import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Last line of defense for the kiosk: if any render throws, show a calm branded
 * fallback instead of a white screen. Chromium reloads on its refresh interval,
 * so a transient render error self-heals on the next boot/refresh.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surfaces in the Chromium console / remote logs if one is attached.
    console.error('Pulse Board crashed:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fixed inset-0 grid place-items-center bg-page text-center">
        <div>
          <div className="font-display text-6xl italic text-accent">BACK NINE GOLF</div>
          <div className="mt-4 text-2xl tracking-[3px] text-text-muted">
            PULSE BOARD — RECOVERING
          </div>
          <div className="mt-2 font-mono text-sm text-text-label">
            The board will refresh automatically.
          </div>
        </div>
      </div>
    );
  }
}
