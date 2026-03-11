import React, { useState } from 'react';
import { Link2, Shield, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCommentStore, type CommentType } from '@/stores/commentStore';

interface CommentFormProps {
  requestId: string;
  onSuccess?: () => void;
}

const TYPE_OPTIONS: { type: CommentType; icon: React.ElementType; label: string; bc: number; description: string; color: string; border: string; bg: string }[] = [
  {
    type: 'sourcing',
    icon: Link2,
    label: 'Sourcing',
    bc: 150,
    description: 'Supplier links, factory contacts, MOQ / pricing (admin-only)',
    color: 'text-amber-700',
    border: 'border-amber-400',
    bg: 'bg-amber-50',
  },
  {
    type: 'qc',
    icon: Shield,
    label: 'QC Tip',
    bc: 50,
    description: 'Product expertise, defects, spec warnings',
    color: 'text-blue-700',
    border: 'border-blue-400',
    bg: 'bg-blue-50',
  },
  {
    type: 'general',
    icon: MessageCircle,
    label: 'General',
    bc: 25,
    description: 'Discussion, questions, feature ideas',
    color: 'text-gray-600',
    border: 'border-gray-300',
    bg: 'bg-gray-50',
  },
];

export const CommentForm: React.FC<CommentFormProps> = ({ requestId, onSuccess }) => {
  const { postComment, isPosting } = useCommentStore();
  const [selectedType, setSelectedType] = useState<CommentType>('general');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Please enter your contribution.');
      return;
    }
    setError('');
    const success = await postComment(requestId, selectedType, content.trim());
    if (success) {
      setContent('');
      onSuccess?.();
    } else {
      setError('Failed to submit. Please try again.');
    }
  };

  const selectedOption = TYPE_OPTIONS.find((o) => o.type === selectedType)!;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type selector */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Select contribution type</p>
        <div className="grid grid-cols-3 gap-3">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedType === opt.type;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => setSelectedType(opt.type)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all text-center
                  ${isSelected ? `${opt.border} ${opt.bg}` : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <Icon size={18} className={isSelected ? opt.color : 'text-gray-400'} />
                <span className={`text-xs font-semibold ${isSelected ? opt.color : 'text-gray-500'}`}>
                  {opt.label}
                </span>
                <span className={`text-xs font-bold ${isSelected ? 'text-amber-600' : 'text-gray-400'}`}>
                  +{opt.bc} BC
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">{selectedOption.description}</p>
      </div>

      {/* Text area */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          selectedType === 'sourcing'
            ? 'Paste supplier link, contact info, MOQ, pricing...'
            : selectedType === 'qc'
            ? 'Share product expertise, known defects, test requirements...'
            : 'Join the discussion...'
        }
        rows={4}
        className="resize-none"
        disabled={isPosting}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button
        type="submit"
        disabled={isPosting || !content.trim()}
        className="w-full bg-[#FF6A00] hover:bg-[#E55D00] text-white gap-2"
      >
        {isPosting ? (
          <>
            <span className="animate-spin">⟳</span> Submitting...
          </>
        ) : (
          <>
            <Send size={14} />
            Submit ({selectedOption.label} · +{selectedOption.bc} BC)
          </>
        )}
      </Button>
    </form>
  );
};
