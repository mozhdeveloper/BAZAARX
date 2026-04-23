import { useState } from 'react';
import { Sparkles, Loader2, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

interface AIContentGeneratorProps {
  campaignName: string;
  campaignType: string;
  onApplySubject: (subject: string) => void;
  onApplyContent: (content: string) => void;
}

export function AIContentGenerator({ campaignName, campaignType, onApplySubject, onApplyContent }: AIContentGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [generatedSubject, setGeneratedSubject] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const { toast } = useToast();

  const generate = async () => {
    const apiKey = import.meta.env.VITE_QWEN_API_KEY;
    if (!apiKey) {
      toast({ title: 'Qwen API key not configured', description: 'Set VITE_QWEN_API_KEY in your .env file.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const prompt = customPrompt.trim() || `Write an email marketing campaign for BazaarX (a Philippine online marketplace).
Campaign name: "${campaignName || 'New Campaign'}"
Campaign type: ${campaignType}
Write a compelling subject line and email body. Use {{buyer_name}} for personalization.
Format response as:
SUBJECT: [subject line]
BODY:
[email body]`;

      const res = await fetch(QWEN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          messages: [
            { role: 'system', content: 'You are a marketing copywriter for BazaarX, a Philippine e-commerce marketplace. Write engaging, professional email campaign content. Always use {{buyer_name}} as the personalization variable. Keep it concise and action-oriented.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';

      const subjectMatch = text.match(/SUBJECT:\s*(.+)/i);
      const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i);

      setGeneratedSubject(subjectMatch?.[1]?.trim() || '');
      setGeneratedContent(bodyMatch?.[1]?.trim() || text);
      toast({ title: 'Content generated!' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'AI generation failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-dashed border-amber-300 rounded-xl p-4 bg-amber-50/50 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">AI Content Generator</span>
        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Qwen</span>
      </div>

      <div>
        <Label className="text-xs text-amber-700">Custom prompt (optional)</Label>
        <Textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Leave blank for auto-generated prompt, or describe what you want..."
          rows={2}
          className="mt-1 text-sm bg-white border-amber-200 focus:border-amber-400"
        />
      </div>

      <Button size="sm" onClick={generate} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
        {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
        {loading ? 'Generating...' : 'Generate Content'}
      </Button>

      {generatedSubject && (
        <div className="bg-white rounded-lg p-3 border border-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-slate-600">Generated Subject</Label>
            <Button variant="ghost" size="sm" onClick={() => onApplySubject(generatedSubject)} className="h-6 px-2 text-xs text-amber-700 hover:text-amber-900">
              <Copy className="w-3 h-3 mr-1" /> Apply
            </Button>
          </div>
          <p className="text-sm text-slate-800 bg-slate-50 rounded px-2 py-1">{generatedSubject}</p>
        </div>
      )}

      {generatedContent && (
        <div className="bg-white rounded-lg p-3 border border-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-slate-600">Generated Body</Label>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={generate} disabled={loading} className="h-6 px-2 text-xs text-slate-500">
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Regenerate
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onApplyContent(generatedContent)} className="h-6 px-2 text-xs text-amber-700 hover:text-amber-900">
                <Copy className="w-3 h-3 mr-1" /> Apply
              </Button>
            </div>
          </div>
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans max-h-40 overflow-y-auto bg-slate-50 rounded p-2">{generatedContent}</pre>
        </div>
      )}
    </div>
  );
}
