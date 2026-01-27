// import { expect, Page, Locator } from '@playwright/test';

// export class ValidationHelper {
//   constructor(private readonly page: Page) {}

//   async validateExpectedErrors(
//     testRow: Record<string, string>,
//     fieldLocatorMap: Record<string, Locator>
//   ): Promise<void> {
//     for (const [fieldKey, locator] of Object.entries(fieldLocatorMap)) {
//       const expectedMessage = testRow[fieldKey]?.trim();
//       if (!expectedMessage) continue;

//       const actualMessage = (await locator.innerText())?.trim();

//       try {
//         expect(actualMessage).toBe(expectedMessage);
//         console.log(`[PASS] ${fieldKey}: "${expectedMessage}"`);
//       } catch (err) {
//         const formattedField = fieldKey.replace(/^ErrMsg_/, '');
//         console.error(`[FAIL] ${formattedField}: Expected = "${expectedMessage}", Actual = "${actualMessage}"`);
//         throw new Error(`Validation failed for ${formattedField}`);
//       }
//     }
//   }
// }

