const { chromium } = require('playwright');

(async () => {
    console.log("Starting browser check...");
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure().errorText));

    await page.goto('http://localhost:3000/play');

    await page.fill('input[placeholder="Guest123"]', 'BUBU');
    await page.fill('input.uppercase', 'PUBLIC');
    await page.click('button:has-text("Join Lobby")');

    await page.waitForTimeout(3000);
    console.log("Done");
    await browser.close();
})();
