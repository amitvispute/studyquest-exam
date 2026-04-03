

# Tablet-Friendly Improvements for StudyQuest

Since Pareet uses a tablet, here are the key UX improvements to make the app more touch-friendly and comfortable on tablet screens.

## Proposed Changes

### 1. Larger Touch Targets
- Increase tab bar height from `h-14` to `h-16` and bump tab text size
- Make all buttons minimum 44×44px (Apple's recommended touch target)
- Increase input field heights for easier tapping (Daily Log form, Mock Exam form, Class Details dialog)

### 2. Better Calendar Interaction
- Increase calendar day cell size from `w-9 h-9` to `w-11 h-11` so scheduled/completed dates are easier to tap
- Add more padding around the calendar component

### 3. Larger Form Controls
- Increase font size on inputs and textareas to 16px (prevents iOS auto-zoom on focus)
- Add more vertical spacing between form fields in the Daily Log and Class Details dialog

### 4. Improved Header & Navigation
- Show user name and role badge on tablet (currently hidden below `sm` breakpoint — tablets at 768px+ should see it)
- Make the logout button slightly larger

### 5. AI Mentor Chat Improvements
- Larger message bubbles with bigger text for readability
- Bigger send button and input field
- Larger quick topic buttons with more padding

### 6. Responsive Grid Tweaks
- On the Classes tab, use side-by-side layout for the two class cards on tablets (landscape)
- Ensure cards have adequate padding and spacing

## Files to Modify
- `src/pages/Index.tsx` — tab bar sizing, grid layouts
- `src/components/ui/calendar.tsx` — larger day cells
- `src/components/ClassSchedule.tsx` — calendar padding, dialog input sizes
- `src/components/DailyLogForm.tsx` — input heights, font sizes
- `src/components/AIMentorChat.tsx` — chat bubble sizes, input sizing
- `src/components/MockExamTracker.tsx` — form input sizes
- `src/index.css` — global input minimum font-size (16px to prevent zoom)

