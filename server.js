const puppeteer = require('puppeteer');

// Function to simulate a delay
const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

(async (liAtCookieValue) => {
  const browser = await puppeteer.launch({
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
  await page.goto('https://www.linkedin.com/company/teamsignzy/posts/?feedView=all', { waitUntil: 'networkidle2' });

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
  
  for (let i = 0; i < limit; i++) {
    const postElement = postElements[i];

    // Extract the post content
    const postText = await postElement.$eval('span.break-words.tvm-parent-container span[dir="ltr"]', span => {
      // Clean up the text by removing <a> tags and their contents
      const innerHTML = span.innerHTML
        .replace(/<a\b[^>]*>(.*?)<\/a>/gi, '') // Remove all anchor tags
        .replace(/<br\s*\/?>/gi, '\n')         // Replace <br> tags with new lines
        .replace(/<[^>]+>/g, '');              // Remove all remaining HTML tags
      return innerHTML.trim();
    });

    console.log(`Post ${i + 1} Text:`, postText);

    // Find and click the control menu button
    const controlMenuButton = await postElement.$('button.feed-shared-control-menu__trigger');
    if (controlMenuButton) {
      console.log(`Clicking on control menu button for post ${i + 1}...`);
      await controlMenuButton.click();

      // Wait for the dropdown to appear
      const dropdownContentSelector = 'div.feed-shared-control-menu__content';
      await page.waitForSelector(dropdownContentSelector, { visible: true });
      console.log(`Control menu for post ${i + 1} opened.`);

      // Find the "Copy link to post" option by its button role
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
        console.log('Clicked on "Copy link to post" button.');
        
        // Wait for the success message and extract the link
        await delay(3000);
        const copiedLink = await page.evaluate(() => {
          const toast = document.querySelector('.artdeco-toast-item__message a.artdeco-toast-item__cta');
          return toast ? toast.href : null;
        });
        
        console.log(`Copied URL for post ${i + 1}: ${copiedLink}`);

        // Close the dropdown after copying the link
        await page.click('body');
        await delay(1000);
      } else {
        console.log(`"Copy link to post" option not found for post ${i + 1}.`);
      }
    } else {
      console.log(`Control menu button not found for post ${i + 1}.`);
    }

    console.log('--------------------------');
  }

  await browser.close();

})('AQEDATXjJCkETv8EAAABkgijRL0AAAGSeedBrVYAwEU6PaFtWYOqjpDGMU82_V_-VoW656Q6WvanoRf65R-aYL7YygWzXuTY_e6pBeCkZIH8nrqBYlxtW8aBqddQJ9lHnBC4ZMu3omkh5iBBBr9lbwf1'); // Replace 'signzy' with the company name and provide the actual 'li_at' cookie value
