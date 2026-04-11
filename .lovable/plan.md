

# Fix: Junk Characters in AI-Generated Mock Exam Questions

## Problem
The AI model returns subject and topic fields with garbage characters like `english漫,topic::`, `Maths漫,topic::`, `VR漫,topic::`, `NVR漫,topic::`. This causes:
1. Subject breakdown in results shows garbled text
2. Score mapping in `StudentExamMode.tsx` fails (e.g., `subjectScores["english"]` finds nothing because the key is `english漫,topic::`)
3. All answers marked incorrect because the `correct_answer` field may also contain junk

## Root Cause
The AI model (gemini-3-flash-preview) sometimes produces malformed tool call arguments with Unicode artifacts. The edge function inserts these raw values into the database without sanitization.

## Fix

### 1. Edge function: Sanitize + validate AI output (`supabase/functions/generate-mock-exam/index.ts`)

After parsing questions from the AI response, sanitize each question before DB insert:

- **Strip non-ASCII junk** from `subject` and `topic` fields
- **Normalize subject names** to lowercase canonical values (`english`, `maths`, `vr`, `nvr`) — reject/map anything else
- **Validate `correct_answer`** exists in the `options` array — if not, find the closest match or flag the question
- **Constrain the prompt** to explicitly list allowed subject values: `"Use ONLY these exact subject values: english, maths, vr, nvr"`
- **Add `max_tokens`** to prevent truncation artifacts

### 2. Prompt improvements

Update the system and user prompts to be more explicit:
- System: "Output subject as one of: english, maths, vr, nvr (lowercase, no other text)"
- Add `max_tokens: 4096` to avoid truncation

### Changes

| File | Change |
|------|--------|
| `supabase/functions/generate-mock-exam/index.ts` | Add sanitization function for subject/topic/correct_answer; improve prompt; add max_tokens |

### Sanitization logic (pseudo)

```typescript
function sanitize(q) {
  // Strip non-printable/non-ASCII from subject & topic
  q.subject = q.subject.replace(/[^\x20-\x7E]/g, '').trim().toLowerCase();
  q.topic = (q.topic || '').replace(/[^\x20-\x7E]/g, '').trim();
  
  // Map to canonical subjects
  const subjectMap = { english: 'english', maths: 'maths', math: 'maths', vr: 'vr', 'verbal reasoning': 'vr', nvr: 'nvr', 'non-verbal reasoning': 'nvr' };
  q.subject = subjectMap[q.subject] || 'english';
  
  // Ensure correct_answer is in options
  if (!q.options.includes(q.correct_answer)) {
    // Try trimmed match
    const match = q.options.find(o => o.trim() === q.correct_answer.trim());
    if (match) q.correct_answer = match;
  }
}
```

## Test
1. Parent creates a new AI mock exam with all 4 subjects
2. Verify questions have clean subject names (english, maths, vr, nvr)
3. Student takes the exam → results show correct subject breakdown with no junk characters
4. Correct answers are properly matched

