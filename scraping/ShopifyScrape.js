const puppeteer = require("puppeteer");

const scrapeArticle = async (page, articleUrl) => {
  // Navigate to article
  await page.goto(articleUrl, { waitUntil: "networkidle0" });
  console.log("Waiting for content to load...");

  // Wait for main elements
  await page.waitForSelector("h1");
  await page.waitForSelector("#article-content");

  const blogData = await page.evaluate(() => {
    const title = document.querySelector("h1").innerText;
    const description = document.querySelector("h1 + p")?.innerText || "";
    const contentDiv = document.querySelector("#article-content");
    let content = "";

    contentDiv.childNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        content += node.innerText + "\n";
      }
    });

    return {
      title: title.trim(),
      description: description.trim(),
      content: content.trim(),
      url: window.location.href,
    };
  });
  return blogData;
};

const ShopifyScrape = async () => {
  try {
    console.log("Starting Shopify blog scraping...");
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: ["--window-size=1920,1080"],
    });

    const page = await browser.newPage();
    const blogPosts = [];

    // Go to main blog page
    console.log("Navigating to Shopify blog page...");
    await page.goto("https://www.shopify.com/blog/latest", {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // Get first 3 article URLs
    console.log("Getting article URLs...");
    const articleUrls = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article.article--index')).slice(0, 3);
      return articles.map(article => {
        // Get the first anchor tag within each article
        const firstLink = article.querySelector('a');
        return firstLink ? firstLink.href : null;
      }).filter(url => url !== null); // Remove any null values
    });

    console.log(`Found ${articleUrls.length} articles to scrape:`, articleUrls);

    // Scrape each article one by one
    for (const url of articleUrls) {
      const blogData = await scrapeArticle(page, url);
      blogPosts.push(blogData);
    }

    console.log("All articles scraped successfully");
    console.log(blogPosts);
    await browser.close();
    console.log("Browser closed. Scraping complete.");

    return blogPosts;
  } catch (error) {
    console.error("Error in ShopifyScrape:", error);
    throw error;
  }
};

module.exports = ShopifyScrape;
