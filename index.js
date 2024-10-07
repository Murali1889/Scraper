const express = require('express');
const puppeteer = require('puppeteer');
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Function to get a random user-agent
function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.1 Safari/605.1.15',
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:82.0) Gecko/20100101 Firefox/82.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:82.0) Gecko/20100101 Firefox/82.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36'
    ];
    const randomIndex = Math.floor(Math.random() * userAgents.length);
    return userAgents[randomIndex];
}

// Function to simulate a delay
const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

// Function to scrape blog data from Signzy
async function scrapeBlog() {
    let browser;
    // const browser = await puppeteer.launch({
    //     headless: true, // non-headless mode to see the browser actions
    //     defaultViewport: null, // full-screen mode
    //     args: ['--start-maximized'], // start browser maximized
    // });
    try {
        browser = await puppeteer.launch({
            executablePath: '/usr/bin/chromium',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--no-zygote',
            ]
        });

        const page = await browser.newPage();
        const userAgent = getRandomUserAgent();
        await page.setUserAgent(userAgent);

        console.log("Starting blog scraping...");

        // Navigate to the blog page
        console.log("Navigating to the blog page...");
        await page.goto('https://www.signzy.com/blog/', { waitUntil: 'networkidle2', timeout: 60000 });
        console.log("Blog page loaded!");

        // Wait for articles to be loaded
        await page.waitForSelector('article');
        console.log("Articles found!");

        // Extract post URLs and metadata
        const articles = await page.evaluate(() => {
            const articleElements = document.querySelectorAll('article');
            const articleData = Array.from(articleElements).map(article => {
                const postUrl = article.querySelector('a') ? article.querySelector('a').href : null;
                const postTitle = article.querySelector('a').innerText || null;
                const postTime = article.querySelector('time') ? article.querySelector('time').getAttribute('datetime') : null;
                return {
                    postTitle,
                    postUrl,
                    postTime,
                };
            });
            return articleData;
        });

        console.log(`Found ${articles.length} articles. Starting content extraction...`);

        let scrapedData = [];

        // Scrape the details from each post URL
        for (let article of articles) {
            try {
                if (article.postUrl) {
                    console.log(`Navigating to post URL: ${article.postUrl}`);
                    const postPage = await browser.newPage();
                    await postPage.goto(article.postUrl, { waitUntil: 'networkidle2' });
                    console.log(`Post page loaded: ${article.postUrl}`);

                    // Wait for the content to be present
                    await postPage.waitForSelector('.entry-content');
                    console.log(`Content found for post: "${article.postTitle}"`);

                    // Extract the content of the post
                    const content = await postPage.evaluate(() => {
                        return document.querySelector('.entry-content').innerText;
                    });

                    console.log(`Extracted content for post: "${article.postTitle}"`);

                    // Add the post data to the scrapedData array
                    scrapedData.push({
                        title: article.postTitle,
                        url: article.postUrl,
                        time: article.postTime,
                        details: content
                    });

                    await postPage.close();

                    // Wait for 2-3 seconds before moving to the next post
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            } catch (error) {
                console.error(`Error scraping post: "${article.postUrl}"`, error);
            }
        }

        console.log(`Successfully extracted data for ${scrapedData.length} posts.`);
        return scrapedData;
    } catch (error) {
        console.error("Error during blog scraping:", error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

// Scraper function that scrapes the LinkedIn company posts
async function scrapeLinkedInPosts(companyUrl, liAtCookieValue) {
    let browser;
    try {
        // const browser = await puppeteer.launch({
        //     headless: true, // non-headless mode to see the browser actions
        //     defaultViewport: null, // full-screen mode
        //     args: ['--start-maximized'], // start browser maximized
        // });
        browser = await puppeteer.launch({
            executablePath: '/usr/bin/chromium',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--no-zygote',
            ]
        });


        const page = await browser.newPage();
        const userAgent = getRandomUserAgent();
        await page.setUserAgent(userAgent);

        console.log(`Starting scraping for LinkedIn company page: ${companyUrl}`);

        // Set LinkedIn li_at cookie to authenticate the session
        const cookie = {
            name: 'li_at',
            value: liAtCookieValue,
            domain: '.linkedin.com',
            path: '/',
            httpOnly: true,
            secure: true,
        };

        await page.setCookie(cookie);

        // Navigate to the LinkedIn company posts URL
        await page.goto(companyUrl, { waitUntil: 'networkidle2' });

        // Wait for the parent div that contains the button to appear using unique class names
        const parentSelector = 'div.sort-dropdown__dropdown.artdeco-dropdown';
        await page.waitForSelector(parentSelector, { visible: true });
        console.log('Parent div found.');

        // Now find the button within the parent using its class
        const buttonSelector = `${parentSelector} button.artdeco-dropdown__trigger`;
        await page.waitForSelector(buttonSelector, { visible: true });

        // Click the "Sort by" button within the parent div
        console.log('Clicking the "Sort by" button...');
        await page.click(buttonSelector);

        // Wait for the dropdown menu to appear inside the parent
        const dropdownSelector = `${parentSelector} div.artdeco-dropdown__content`;
        await page.waitForSelector(dropdownSelector, { visible: true });
        console.log('Dropdown menu appeared.');

        // Now, find the second <li> element inside the dropdown
        const secondLiSelector = `${dropdownSelector} li:nth-child(2)`;
        await page.waitForSelector(secondLiSelector, { visible: true });

        // Click the second <li> element (selecting "Recent")
        console.log('Clicking the second <li> element in the dropdown (Recent)...');
        await page.click(secondLiSelector);

        // Click outside to close the dropdown by clicking on the body
        await page.click('body');
        console.log('Dropdown closed by clicking outside.');

        // Wait for a few seconds to observe the result after the li element click
        await delay(3000);

        // Now get the posts inside the `scaffold-finite-scroll__content` div
        const postsSelector = 'div.scaffold-finite-scroll__content > div';
        const postElements = await page.$$(postsSelector); // Get all post elements

        // Limit to top 5 posts
        const limit = Math.min(postElements.length, 5);
        let postsData = [];

        for (let i = 0; i < limit; i++) {
            const postElement = postElements[i];
            const post = {}
            // Extract the post content
            const postText = await postElement.$eval('span.break-words.tvm-parent-container span[dir="ltr"]', span => {
              // Clean up the text by removing <a> tags and their contents
              const innerHTML = span.innerHTML
                .replace(/<a\b[^>]*>(.*?)<\/a>/gi, '') // Remove all anchor tags
                .replace(/<br\s*\/?>/gi, '\n')         // Replace <br> tags with new lines
                .replace(/<[^>]+>/g, '');              // Remove all remaining HTML tags
              return innerHTML.trim();
            });

            post.title = postText;
        
            console.log(`Post ${i + 1} Text:`, postText);
        
            // Find and click the control menu button
            const controlMenuButton = await postElement.$('button.feed-shared-control-menu__trigger');
            if (controlMenuButton) {
              console.log(`Clicking on control menu button for post ${i + 1}...`);
              await controlMenuButton.click();
        
              // Wait for the dropdown to appear
              const dropdownContentSelector = 'div.feed-shared-control-menu__content';
              await postElement.waitForSelector(dropdownContentSelector, { visible: true });
              console.log(`Control menu for post ${i + 1} opened.`);
        
        
              // Find the "Copy link to post" option by its button role
              const copyLinkButton = await postElement.$eval('div.feed-shared-control-menu__content', menuContent => {
                const menuItems = menuContent.querySelectorAll('li.feed-shared-control-menu__item');
                for (let item of menuItems) {
                  const headline = item.querySelector('h5.feed-shared-control-menu__headline');
                  console.log(headline)
                  if (headline && headline.textContent.includes('Copy link to post')) {
                    const button = item.querySelector('div[role="button"]');
                    button.click();
                    return true;
                  }
                }
                return false;
              });
        
              if (copyLinkButton) {
                console.log('Clicked on "Copy link to post" button.');
        
                // Wait for the success message and extract the link
                await delay(3000);
                const copiedLink = await page.evaluate(() => {
                  const toast = document.querySelector('.artdeco-toast-item__message a.artdeco-toast-item__cta');
                  return toast ? toast.href : null;
                });
        
                console.log(`Copied URL for post ${i + 1}: ${copiedLink}`);
                post.url=copiedLink
        
                // Close the dropdown after copying the link
                await page.click('body');
                await delay(1000);
              } else {
                console.log(`"Copy link to post" option not found for post ${i + 1}.`);
              }
            } else {
              console.log(`Control menu button not found for post ${i + 1}.`);
            }
            postsData.push(post)
            console.log('--------------------------');
          }

        await browser.close();
        console.log(`Successfully extracted data for ${postsData.length} posts from LinkedIn.`);
        return postsData;
    } catch (error) {
        console.error('Error scraping LinkedIn posts:', error);
        throw error;
    }
}

module.exports = scrapeLinkedInPosts;

// API endpoint to scrape LinkedIn posts
app.get('/linkedinposts', async (req, res) => {
    const { companyUrl, liAtCookie } = req.query;

    if (!companyUrl || !liAtCookie) {
        return res.status(400).json({ success: false, message: 'companyUrl and liAtCookie parameters are required.' });
    }

    try {
        const data = await scrapeLinkedInPosts(companyUrl, liAtCookie);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error scraping LinkedIn posts', error: error.message });
    }
});

// API endpoint to scrape and return blog data
app.get('/scrape', async (req, res) => {
    try {
        const data = await scrapeBlog();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error scraping blog data', error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
