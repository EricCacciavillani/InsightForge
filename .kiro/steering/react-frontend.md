---
inclusion: fileMatch
fileMatchPattern: "frontend/src/**/*.tsx"
---

# React Frontend Rules

When working on React components:

- Use functional components with hooks (no class components)
- Use Tailwind CSS for styling, follow existing color scheme (slate/purple)
- API calls go through the `useApi` hook in `hooks/useApi.ts`
- WebSocket updates come from the same hook
- Keep components small and focused
- TypeScript types go in `src/types/`

## Component Structure

- Max ~200 lines per component; split if larger
- Props should be <8 items; use object destructuring
- One responsibility per component
- Extract reusable logic into custom hooks

## State Management

- Use `useState` for local component state
- Use context (`useApi` hook) for global API state
- Lift state up only when needed by sibling components
- Avoid prop drilling beyond 2 levels

## API Integration

- All API calls through `useApi` hook
- Handle loading state: show spinner while fetching
- Handle error state: show error message with retry button
- Handle empty state: show placeholder before data arrives

```tsx
const { data, loading, error, refetch } = useApi('/endpoint');

if (loading) return <Spinner />;
if (error) return <ErrorMessage error={error} onRetry={refetch} />;
if (!data) return <EmptyState />;
```

## Error Handling

- Wrap page components in ErrorBoundary for crash protection
- Display user-friendly error messages (not raw errors)
- Log errors for debugging but don't expose internals to user

## Accessibility

- Use semantic HTML (`button`, `section`, `nav`, `main`, etc.)
- Include `alt` text for images
- Ensure keyboard navigation works (Tab, Enter, Escape)
- Use `aria-label` for icon-only buttons

## TypeScript

```tsx
interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

const MyComponent: React.FC<Props> = ({ title, onSubmit, isLoading = false }) => {
  // ...
};
```

## JSDoc Comments (Google-Style)

Use JSDoc comments for exported functions, hooks, and complex components. Keep them concise.

### Function/Hook Documentation

```tsx
/**
 * Fetches and manages API connection state.
 *
 * @param endpoint - The API endpoint to connect to.
 * @param options - Optional configuration for the request.
 * @returns Object containing data, loading state, and error.
 *
 * @example
 * const { data, loading } = useApi('/runs');
 */
export function useApi<T>(endpoint: string, options?: RequestOptions): ApiResult<T> {
  // ...
}
```

### Component Documentation

```tsx
/**
 * Displays a tooltip on hover with customizable position.
 *
 * @param content - Text or element to display in tooltip.
 * @param position - Where to show tooltip relative to children.
 */
export const Tooltip: React.FC<TooltipProps> = ({ content, position = 'top', children }) => {
  // ...
};
```

### Key Guidelines

- First line: brief description of what it does
- `@param` for each parameter (type comes from TypeScript)
- `@returns` for non-void return values
- `@example` for complex usage (optional)
- Skip JSDoc for simple, self-explanatory components

## Testing

- Unit tests for utilities and hooks
- Component tests using React Testing Library
- Mock `useApi` hook responses in tests
