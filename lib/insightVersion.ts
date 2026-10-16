// Version of the AI college briefing (lib/collegeInsight.ts). Bump when the prompt
// changes in a way readers would notice, so cached briefings (database + browser) are
// rewritten instead of served in the old style. Kept in its own file so the browser can
// import it without pulling in the Anthropic SDK.
// 2: briefings speak to the student as "you".
export const INSIGHT_VERSION = 2;
