import { chromium } from '@playwright/test';
import path from 'path';

async function takeScreenshot() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    // Use basic auth credentials via page.setExtraHTTPHeaders
    const auth = Buffer.from('admin:admin123').toString('base64');
    await page.setExtraHTTPHeaders({
      'Authorization': `Basic ${auth}`
    });

    // Capture Articles Page (where Curation Workbench should be GONE but Filters remain)
    await page.goto('http://localhost:3000/articles', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(3000);
    const articlesPath = path.resolve('articles_verify_fixed.png');
    await page.screenshot({ path: articlesPath, fullPage: true });
    console.log(`Articles screenshot saved to: ${articlesPath}`);

    // Try to open the Publishing Hub (this is where it was crashing before)
    const exploreBtn = await page.$('button:has-text("Explore Opportunities")');
    if (exploreBtn) {
      await exploreBtn.click();
      await page.waitForTimeout(2000);
      const hubPath = path.resolve('publishing_hub_verify.png');
      await page.screenshot({ path: hubPath, fullPage: false });
      console.log(`Publishing Hub screenshot saved to: ${hubPath}`);
    }
  } catch (error) {
    console.error('Failed to take screenshot:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

takeScreenshot();
