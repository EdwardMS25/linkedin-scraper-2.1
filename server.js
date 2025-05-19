const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

app.post("/scrape", async (req, res) => {
  const { email, password } = req.body;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    await page.goto("https://www.linkedin.com/login", { waitUntil: "networkidle2" });
    await page.type("#username", email);
    await page.type("#password", password);
    await page.click("[type='submit']");
    await page.waitForNavigation();

    await page.goto("https://www.linkedin.com/feed/", { waitUntil: "networkidle2" });

    const posts = await page.evaluate(() => {
      const postElements = document.querySelectorAll("div.feed-shared-update-v2");
      const results = [];
      postElements.forEach((el) => {
        const content = el.innerText;
        const dateMatch = content.match(/\d{1,2} (?:h|d|w)/);
        if (dateMatch) {
          results.push({
            text: content.slice(0, 200),
            timeAgo: dateMatch[0],
          });
        }
      });
      return results;
    });

    await browser.close();
    res.json(posts);
  } catch (error) {
    console.error("Scrape error:", error);
    await browser.close();
    res.status(500).json({ error: "Scraping failed" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
