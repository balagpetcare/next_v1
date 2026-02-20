"use client";

type Props = {
  message: string;
  onRetry: () => void;
};

export function ProductsErrorState({ message, onRetry }: Props) {
  return (
    <div className="text-center py-5 px-3">
      <div className="alert alert-danger radius-12 d-inline-block text-start" role="alert">
        <p className="mb-2">{message}</p>
        <button type="button" className="btn btn-sm btn-outline-danger radius-12" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}
