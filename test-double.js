const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    console.log("Starting browsers...");
    const browser1 = await chromium.launch({ headless: true });
    const browser2 = await chromium.launch({ headless: true });

    const ctx1 = await browser1.newContext();
    const ctx2 = await browser2.newContext();

    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    console.log("Navigating...");
    await page1.goto('http://localhost:3000/play');
    await page2.goto('http://localhost:3000/play');

    console.log("Joining logic...");
    // Wait for the join button
    await page1.waitForSelector('button:has-text("Join Lobby")');
    await page2.waitForSelector('button:has-text("Join Lobby")');

    // Fill Page 1
    await page1.fill('input[placeholder="Guest123"]', 'Player1');
    await page1.fill('input.uppercase', 'TESTROOM');
    await page1.click('button:has-text("Join Lobby")');

    // Fill Page 2
    await page2.fill('input[placeholder="Guest123"]', 'Player2');
    await page2.fill('input.uppercase', 'TESTROOM');
    await page2.click('button:has-text("Join Lobby")');

    // Wait for boards
    console.log("Waiting for gameboards...");
    await page1.waitForSelector('.glass-panel');
    await page2.waitForSelector('.glass-panel');

    // Give it 3 seconds for socket sync
    await new Promise(r => setTimeout(r, 3000));

    console.log("Taking screenshots...");
    await page1.screenshot({ path: '/tmp/p1.png' });
    await page2.screenshot({ path: '/tmp/p2.png' });

    console.log("Done");
    await browser1.close();
    await browser2.close();
})();
