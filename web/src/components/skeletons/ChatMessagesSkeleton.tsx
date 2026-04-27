/**
 * ChatMessagesSkeleton — shimmer skeleton for the chat messages area.
 * Alternating left/right bubble placeholders.
 */

const BUBBLE_WIDTHS = ['w-48', 'w-56', 'w-36', 'w-64', 'w-44', 'w-52'];

export default function ChatMessagesSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4 p-4">
      {BUBBLE_WIDTHS.map((w, i) => {
        const isRight = i % 3 === 0; // roughly alternating
        return (
          <div key={i} className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
            <div className={`${w} space-y-2`}>
              <div
                className={`h-10 rounded-2xl ${
                  isRight
                    ? 'bg-orange-100 rounded-tr-sm'
                    : 'bg-gray-200 rounded-tl-sm'
                }`}
              />
              <div className={`h-2 rounded-full w-12 ${isRight ? 'ml-auto bg-orange-50' : 'bg-gray-100'}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
