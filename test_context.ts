import db from './server/db.ts';
import { ChatbotService } from './server/services/chatbotService.ts';

async function test() {
  try {
    const context = await ChatbotService.getUserContext(1); // Assuming user 1
    console.log("Context =>", context);
  } catch (e) {
    console.error("Error", e);
  }
}
test();
