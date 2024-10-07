const express = require('express');
const puppeteer = require('puppeteer');
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Scraper function that scrapes the blog and returns the post data
async function scrapeBlog() {
    let browser;
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

        // Navigate to the blog page
        console.log("Navigating to the blog page...");
        await page.goto('https://www.signzy.com/blog/', { waitUntil: 'networkidle2', timeout:60000 });
        console.log("Page loaded!");

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

        console.log("Extracted articles:", articles);

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
                    console.log("Content found!");

                    // Extract the content of the post
                    const content = await postPage.evaluate(() => {
                        return document.querySelector('.entry-content').innerText;
                    });

                    console.log("Extracted content:", content);

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
                console.error(`Error scraping ${article.postUrl}:`, error);
            }
        }

        return scrapedData;
    } catch (error) {
        console.error("Error during browser setup or navigation:", error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

// Scraper function that scrapes the LinkedIn company posts
async function scrapeLinkedInPosts(companyUrl, liAtCookieValue) {
    let browser;
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

        // Set LinkedIn li_at cookie to authenticate the session
        const cookie = {
            name: 'li_at',
            value: liAtCookieValue,
            domain: '.linkedin.com',
            path: '/',
            httpOnly: true,
            secure: true,
        };

        // Set the LinkedIn cookie to ensure you are authenticated
        await page.setCookie(cookie);

        // Navigate to the LinkedIn company posts URL
        console.log("Navigating to LinkedIn company page...");
        await page.goto(companyUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // Adding delay to ensure page is loaded
        await delay(2000);

        // Wait for the parent div that contains the button to appear using unique class names
        const parentSelector = 'div.sort-dropdown__dropdown.artdeco-dropdown';
        await page.waitForSelector(parentSelector, { visible: true });
        console.log('Parent div found.');

        // Adding delay before clicking the button
        await delay(1000);

        // Now find the button within the parent using its class
        const buttonSelector = `${parentSelector} button.artdeco-dropdown__trigger`;
        await page.waitForSelector(buttonSelector, { visible: true });

        // Click the "Sort by" button within the parent div
        await page.click(buttonSelector);

        // Adding delay before interacting with dropdown
        await delay(2000);

        // Wait for the dropdown menu to appear inside the parent
        const dropdownSelector = `${parentSelector} div.artdeco-dropdown__content`;
        await page.waitForSelector(dropdownSelector, { visible: true });

        // Find and click the second <li> element (selecting "Recent")
        const secondLiSelector = `${dropdownSelector} li:nth-child(2)`;
        await page.click(secondLiSelector);

        // Adding delay after selecting "Recent"
        await delay(2000);

        // Click outside to close the dropdown by clicking on the body
        await page.click('body');

        // Adding delay after closing dropdown
        await delay(2000);

        // Now get the posts inside the `scaffold-finite-scroll__content` div
        const postsSelector = 'div.scaffold-finite-scroll__content > div';
        const postElements = await page.$$(postsSelector); // Get all post elements

        // Limit to top 5 posts
        const limit = Math.min(postElements.length, 5);
        let postsData = [];

        for (let i = 0; i < limit; i++) {
            const postElement = postElements[i];

            // Adding delay before extracting each post content
            await delay(1000);

            // Extract the post content
            const postText = await postElement.$eval('span.break-words.tvm-parent-container span[dir="ltr"]', span => {
                const innerHTML = span.innerHTML
                    .replace(/<a\b[^>]*>(.*?)<\/a>/gi, '') // Remove all anchor tags
                    .replace(/<br\s*\/?>/gi, '\n')         // Replace <br> tags with new lines
                    .replace(/<[^>]+>/g, '');              // Remove all remaining HTML tags
                return innerHTML.trim();
            });

            postsData.push({ postText });

            // Find and click the control menu button
            const controlMenuButton = await postElement.$('button.feed-shared-control-menu__trigger');
            if (controlMenuButton) {
                await controlMenuButton.click();

                // Adding delay before opening dropdown
                await delay(1000);

                // Wait for the dropdown to appear
                const dropdownContentSelector = 'div.feed-shared-control-menu__content';
                await postElement.waitForSelector(dropdownContentSelector, { visible: true });

                // Find the "Copy link to post" option
                const copyLinkButton = await postElement.$eval('div.feed-shared-control-menu__content', menuContent => {
                    const menuItems = menuContent.querySelectorAll('li.feed-shared-control-menu__item');
                    for (let item of menuItems) {
                        const headline = item.querySelector('h5.feed-shared-control-menu__headline');
                        if (headline && headline.textContent.includes('Copy link to post')) {
                            const button = item.querySelector('div[role="button"]');
                            button.click();
                            return true;
                        }
                    }
                    return false;
                });

                if (copyLinkButton) {
                    await delay(3000);
                    const copiedLink = await page.evaluate(() => {
                        const toast = document.querySelector('.artdeco-toast-item__message a.artdeco-toast-item__cta');
                        return toast ? toast.href : null;
                    });
                    postsData[i].copiedLink = copiedLink;
                }
            }

            // Adding a small delay between processing posts
            await delay(2000);
        }

        await browser.close();
        return postsData;
    } catch (error) {
        console.error('Error scraping LinkedIn posts:', error);
        if (browser) await browser.close();
        throw error;
    }
}

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
        res.status(500).json({ success: false, message: 'Error scraping data', error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
