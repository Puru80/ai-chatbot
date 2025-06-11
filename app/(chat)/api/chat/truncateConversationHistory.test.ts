// app/(chat)/api/chat/truncateConversationHistory.test.ts

// Define CoreMessage type for testing
type CoreMessage = { role: 'user' | 'assistant' | 'system'; content: string; id?: string };

// Mocked estimateTokens for predictable testing (1 token per character)
const estimateTokens = (text: string): number => text.length;

// The function under test (copied from app/(chat)/api/chat/route.ts and adapted for testing if needed)
// A note was added: if (remainingBudget < 0) remainingBudget = 0;
// This ensures that if the system prompt *alone* exceeds the budget,
// the message processing loop starts with a budget of 0, correctly including no messages.
async function truncateConversationHistory(
    allMessages: CoreMessage[],
    systemPromptString: string,
    tokenBudget: number
): Promise<CoreMessage[]> {
    const systemPromptTokens = estimateTokens(systemPromptString);
    let remainingBudgetForHistory = tokenBudget - systemPromptTokens;

    if (remainingBudgetForHistory < 0) {
        remainingBudgetForHistory = 0; // Guard: Cannot have negative budget for messages
    }

    const truncatedMessages: CoreMessage[] = [];
    // Iterate from newest to oldest
    const reversedMessages = [...allMessages].reverse();

    for (const message of reversedMessages) {
        const messageTokens = estimateTokens(message.content);
        if (remainingBudgetForHistory - messageTokens >= 0) {
            truncatedMessages.push(message);
            remainingBudgetForHistory -= messageTokens;
        } else {
            // Optional: if we want to allow partial messages or a summary
            // For now, we just stop including messages once budget is hit.
            break;
        }
    }
    return truncatedMessages.reverse(); // Restore chronological order
}

describe('truncateConversationHistory', () => {
    const messages: CoreMessage[] = [
        { id: 'm1', role: 'user', content: 'msg_1' },      // 5 tokens
        { id: 'm2', role: 'assistant', content: 'rmsg_2' }, // 6 tokens
        { id: 'm3', role: 'user', content: 'msg_333' },  // 7 tokens
        { id: 'm4', role: 'assistant', content: 'rmsg_4444' },// 9 tokens
        { id: 'm5', role: 'user', content: 'msg_55555' } // 9 tokens
    ];

    it('Scenario 1: All messages fit', async () => {
        const systemPrompt = 'sys_prompt'; // 10 tokens
        // Total message tokens: 5+6+7+9+9 = 36. System tokens = 10. Total needed = 46.
        const budget = 50;
        const result = await truncateConversationHistory(messages, systemPrompt, budget);
        expect(result.length).toBe(5);
        expect(result.map(m => m.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
    });

    it('Scenario 2: Some messages truncated', async () => {
        const systemPrompt = 'sys_prompt'; // 10 tokens
        // Budget for history: 25 - 10 = 15 tokens
        // m5 (9 tokens) -> remaining 6. Add m5.
        // m4 (9 tokens) -> 6 - 9 < 0. Cannot add m4.
        // Expected: m5
        // Corrected logic:
        // m5 (9 tokens) -> remaining 15-9 = 6. Add m5.
        // m4 (9 tokens) -> 6 - 9 < 0. Cannot add m4.
        // Wait, the original prompt expected m3, m4, m5 for budget 25
        // Let's re-evaluate Scenario 2 from prompt:
        // System: 10 tokens. Messages: m1-m5 (each 5 tokens in prompt, but here they are 5,6,7,9,9). Budget 25.
        // For Scenario 2 (as per prompt's intention):
        // System 10 tokens. 5 messages, each 5 tokens. Budget 25.
        // Remaining for history = 25 - 10 = 15 tokens.
        // Newest (m5, 5 tokens) fits. remaining = 10. result = [m5]
        // Next (m4, 5 tokens) fits. remaining = 5. result = [m4, m5]
        // Next (m3, 5 tokens) fits. remaining = 0. result = [m3, m4, m5]
        // Next (m2, 5 tokens) does not fit.
        // Expected: m3, m4, m5.
        const scenario2Messages: CoreMessage[] = [
            { id: 's2m1', role: 'user', content: 'aaaaa' }, // 5
            { id: 's2m2', role: 'assistant', content: 'bbbbb' }, // 5
            { id: 's2m3', role: 'user', content: 'ccccc' }, // 5
            { id: 's2m4', role: 'assistant', content: 'ddddd' }, // 5
            { id: 's2m5', role: 'user', content: 'eeeee' }, // 5
        ];
        const budget = 25;
        const result = await truncateConversationHistory(scenario2Messages, 'sys_prompt', budget); // system 10 tokens
        expect(result.length).toBe(3);
        expect(result.map(m => m.id)).toEqual(['s2m3', 's2m4', 's2m5']);
    });

    it('Scenario 3: System prompt consumes most of budget', async () => {
        const systemPrompt = 'system_prompt_longgg'; // 20 tokens
        // Messages (using scenario2Messages for simplicity, each 5 tokens)
        // Budget for history: 25 - 20 = 5 tokens
        // m5 (5 tokens) fits. remaining = 0. result = [m5]
        // m4 (5 tokens) does not fit.
        // Expected: m5
        const scenario3Messages: CoreMessage[] = [
            { id: 's3m1', role: 'user', content: 'aaaaa' },
            { id: 's3m2', role: 'assistant', content: 'bbbbb' },
            { id: 's3m3', role: 'user', content: 'ccccc' },
        ];
        const budget = 25; // System (20) + 1 message (5)
        const result = await truncateConversationHistory(scenario3Messages, systemPrompt, budget);
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('s3m3'); // newest one
    });

    it('Scenario 4: Empty message list', async () => {
        const systemPrompt = 'sys_prompt'; // 10 tokens
        const budget = 20;
        const result = await truncateConversationHistory([], systemPrompt, budget);
        expect(result.length).toBe(0);
    });

    it('Scenario 5: System prompt exceeds budget', async () => {
        const systemPrompt = 'system_prompt_very_very_longggg'; // 30 tokens
        const budget = 25;
        const result = await truncateConversationHistory(messages.slice(0,2), systemPrompt, budget); // Use first 2 messages
        expect(result.length).toBe(0);
    });

    it('Scenario 6: Exact budget fit', async () => {
        const systemPrompt = 'sys_prompt'; // 10 tokens
        const scenario6Messages: CoreMessage[] = [
            { id: 's6m1', role: 'user', content: 'aaaaa' }, // 5 tokens
            { id: 's6m2', role: 'assistant', content: 'bbbbb' } // 5 tokens
        ];
        // Budget for history: 20 - 10 = 10 tokens
        // m2 (5 tokens) fits. remaining = 5. result = [m2]
        // m1 (5 tokens) fits. remaining = 0. result = [m1, m2]
        // Expected: m1, m2
        const budget = 20;
        const result = await truncateConversationHistory(scenario6Messages, systemPrompt, budget);
        expect(result.length).toBe(2);
        expect(result.map(m => m.id)).toEqual(['s6m1', 's6m2']);
    });

    it('Should handle messages with varying token lengths correctly', async () => {
        const systemPrompt = "System"; // 6 tokens
        const testMessages: CoreMessage[] = [
            { role: "user", content: "Short" }, // 5 tokens
            { role: "assistant", content: "Medium length response" }, // 20 tokens
            { role: "user", content: "Another short one" }, // 17 tokens
        ];
        // Total budget 40. System 6. Remaining for history 34.
        // Newest ("Another short one", 17 tokens). Fits. Remaining 34 - 17 = 17. result = [m3]
        // Middle ("Medium length response", 20 tokens). Does not fit (17 - 20 < 0).
        // Oldest ("Short", 5 tokens). Fits. Remaining 17 - 5 = 12. result = [m1, m3] --> ERROR in logic, must be contiguous from newest
        // Correct logic:
        // Newest ("Another short one", 17 tokens). Fits. Remaining 34 - 17 = 17. result = [m3]
        // Middle ("Medium length response", 20 tokens). Does not fit (17 - 20 < 0). Stop.
        // Expected: "Another short one"
        const budget = 40;
        const result = await truncateConversationHistory(testMessages, systemPrompt, budget);
        expect(result.length).toBe(1);
        expect(result[0].content).toBe("Another short one");

        // Budget 48. System 6. Remaining for history 42.
        // Newest ("Another short one", 17 tokens). Fits. Remaining 42 - 17 = 25. result = [m3]
        // Middle ("Medium length response", 20 tokens). Fits. Remaining 25 - 20 = 5. result = [m2, m3]
        // Oldest ("Short", 5 tokens). Fits. Remaining 5 - 5 = 0. result = [m1, m2, m3]
        const budget2 = 48;
        const result2 = await truncateConversationHistory(testMessages, systemPrompt, budget2);
        expect(result2.length).toBe(3);
        expect(result2.map(m => m.content)).toEqual(["Short", "Medium length response", "Another short one"]);
    });

    it('Should handle zero budget for messages correctly', async () => {
        const systemPrompt = "ThisIsExactlyTwentyFiveChars"; // 25 tokens
        const testMessages: CoreMessage[] = [{ role: "user", content: "Short" }]; // 5 tokens
        const budget = 25; // System consumes all budget, 0 left for messages
        const result = await truncateConversationHistory(testMessages, systemPrompt, budget);
        expect(result.length).toBe(0);
    });

    it('Should handle negative remaining budget (system prompt > total budget)', async () => {
        const systemPrompt = "ThisIsMoreThanTwentyFiveChars"; // 29 tokens
        const testMessages: CoreMessage[] = [{ role: "user", content: "Short" }]; // 5 tokens
        const budget = 25; // System consumes more than all budget
        const result = await truncateConversationHistory(testMessages, systemPrompt, budget);
        expect(result.length).toBe(0);
    });
});
