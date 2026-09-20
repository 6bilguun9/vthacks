export const QUESTION_LIMIT = 1000;

export function canSendQuestion(value: string) {
  return value.trim().length > 0 && value.length <= QUESTION_LIMIT;
}

export function shouldSendOnEnter(event: { key: string; shiftKey: boolean; isComposing: boolean; keyCode?: number }) {
  // Safari can report composition ending just before Enter, while still using code 229.
  return event.key === "Enter" && !event.shiftKey && !event.isComposing && event.keyCode !== 229;
}
