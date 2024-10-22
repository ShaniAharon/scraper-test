import * as cheerio from "cheerio";
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const selectRandomUserAgent = () => {
    const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)  AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.157 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36",
    ];
    var randomNumber = Math.floor(Math.random() * userAgents.length);
    return userAgents[randomNumber];
};

export async function searchGoogle(searchQuery) {
    // const query = searchQuery.split(" ").join("+");
    const query = encodeURIComponent(searchQuery);;
    const userAgent = selectRandomUserAgent();
    try {
        const start = Date.now();

        const browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
        });

        const page = await browser.newPage();
        await page.setUserAgent(userAgent);
        const url = `https://www.google.com/search?q=${query}`;
        //TODO: can add logic to search in law article with google scholar 
        // https://scholar.google.co.th/scholar?hl=en&as_sdt=0%2C5&q=accessibility+in+tourism&oq=
        console.log("url", url);

        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForSelector('#search a[href^="http"]', { timeout: 120000 });

        const firstResultLink = await page.evaluate(() => {
            // const firstResult = document.querySelector('#res a[href^="http"]'); // second link
            // let firstResult = document.querySelector('#res .g a[href^="http"]');
            let firstResult = document.querySelector('#search a[href^="http"]');
            if (!firstResult?.href) {
                const allLinks = Array.from(document.querySelectorAll('#search a[href^="http"]'));
                const hrefs = allLinks.map(el => el.href)
                console.log('hrefs', hrefs)
                firstResult = allLinks[0]
            }
            return firstResult ? firstResult.href : null;
        });
        console.log('firstResultLink', firstResultLink)

        if (!firstResultLink) {
            console.log("No results found.");
            await browser.close();
            return [];
        }

        await page.goto(firstResultLink, { waitUntil: "domcontentloaded" });

        const result = await page.evaluate(() => {
            const textCollected = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')).map(el => el.innerText);
            // const imgUrls = Array.from(document.querySelectorAll('img')).map(img => img.src);
            // return { textCollected, imgUrls };
            return { textCollected };
        });

        await browser.close();
        console.log("Browser closed");

        const websites = [{
            websiteLink: firstResultLink,
            textCollected: result.textCollected,
            // imgUrls: result.imgUrls,
        }];
        console.log('websites', websites)

        const end = Date.now();
        console.log(`Time in seconds: ${Math.floor((end - start) / 1000)}`);
        return websites;
    } catch (error) {
        console.log("Error at searchGoogle:", error.message);
    }
}

// function filterUrls(urls) {
//     const problematicPatterns = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i;
//     return urls.filter(url => !problematicPatterns.test(url));
// }
function filterUrls(urls) {
    const problematicPatterns = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i;
    const uniqueUrls = Array.from(new Set(urls));
    return uniqueUrls.filter(url => !problematicPatterns.test(url));
}


//retrive first 4 res from google search 
export async function retriveResFromGoogle(searchQuery, num) {
    // const query = searchQuery.split(" ").join("+");
    const query = encodeURIComponent(searchQuery);;
    const userAgent = selectRandomUserAgent();
    try {
        const start = Date.now();

        const browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
        });

        const page = await browser.newPage();
        await page.setUserAgent(userAgent);
        const url = `https://www.google.com/search?q=${query}`;
        //TODO: can add logic to search in law article with google scholar 
        // https://scholar.google.co.th/scholar?hl=en&as_sdt=0%2C5&q=accessibility+in+tourism&oq=
        console.log("url", url);

        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForSelector('#search a[href^="http"]', { timeout: 160000 });

        let urls = await page.evaluate(() => {
            const allLinks = Array.from(document.querySelectorAll('#search a[href^="http"]'));
            const hrefs = allLinks.map(el => el.href)
            return hrefs ? hrefs : null;
        });
        console.log('urls', urls)

        if (!urls) {
            console.log("No results found.");
            await browser.close();
            return [];
        }
        urls = filterUrls(urls);

        await browser.close();
        console.log("Browser closed");
        const end = Date.now();
        console.log(`Time in seconds: ${Math.floor((end - start) / 1000)}`);
        return urls.slice(0, num)
    } catch (error) {
        console.log("Error at retriveResFromGoogle:", error.message);
    }
}

//TODO: change to all the urls at once
export async function extractGoogleWebsiteInfo(url) {
    // const query = searchQuery.split(" ").join("+");
    // const query = encodeURIComponent(searchQuery);;
    const userAgent = selectRandomUserAgent();
    try {
        const start = Date.now();

        const browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
        });

        const page = await browser.newPage();
        await page.setUserAgent(userAgent);

        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForSelector('div', { timeout: 120000 });

        const result = await page.evaluate(() => {
            const textCollected = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')).map(el => el.innerText);
            // const imgUrls = Array.from(document.querySelectorAll('img')).map(img => img.src);
            // return { textCollected, imgUrls };
            return { textCollected };
        });

        await browser.close();
        console.log("Browser closed");

        const websites = [{
            websiteLink: url,
            textCollected: result.textCollected,
            // imgUrls: result.imgUrls,
        }];
        console.log('websites', websites)

        const end = Date.now();
        console.log(`Time in seconds: ${Math.floor((end - start) / 1000)}`);
        return websites;
    } catch (error) {
        console.log("Error at searchGoogle:", error.message);
    }
}


// Function to log in to LinkedIn and scrape a user's profile info
export async function extractLinkedInProfileInfo(firstName, lastName, title) {
    const userAgent = selectRandomUserAgent(); // Select a random user agent
    try {
        const start = Date.now();

        const browser = await puppeteer.launch({
            headless: true, // Set this to false if you want see it run on browser
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
        });

        const page = await browser.newPage();
        await page.setUserAgent(userAgent);

        // Increase the timeout globally
        page.setDefaultNavigationTimeout(150000); // 120 seconds
        page.setDefaultTimeout(150000); // 120 seconds for selectors

        // 1. Go to LinkedIn login page
        await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

        // 2. Login with credentials
        await page.type('#username', process.env.LINKEDIN_EMAIL); // Your LinkedIn email
        await page.type('#password', process.env.LINKEDIN_PASSWORD); // Your LinkedIn password
        await page.click('button[type="submit"]');
        // await page.waitForNavigation({ waitUntil: 'networkidle0' });

        console.log("Logged in to LinkedIn");

        // 3. Wait for navigation to the homepage
        // await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        console.log("linkedin page loaded");



        // 4. Ensure the search bar is visible and ready
        await page.waitForSelector('.search-global-typeahead__input', { timeout: 200000 });
        // await page.waitForSelector('[class*="search-global-typeahead__input"]', { timeout: 200000 });
        console.log('global search visible')


        // 3. Search for the user
        console.log('`${firstName} ${lastName} ${title}`', `${firstName} ${lastName} ${title}`)
        const searchQuery = `${firstName} ${lastName} ${title}`;
        await page.type('.search-global-typeahead__input', searchQuery); // Search in LinkedIn search box
        await page.keyboard.press('Enter');

        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.search-results-container', { timeout: 120000 });

        // 4. Click on the first search result (profile)
        await page.click('.search-results-container a'); // Click on the first result
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.scaffold-layout__main', { timeout: 120000 });
        // await page.waitForSelector('.pv-profile-card', { timeout: 20000 });
        await page.waitForSelector('#about', { timeout: 20000 });
        // await page.waitForNavigation({ waitUntil: 'domcontentloaded' });



        console.log("Navigated to user's profile");

        // 5. Scrape information from the user's profile page
        // const result = await page.evaluate(() => {
        //     const profileInfo = {};

        //     // Collecting name, headline, and location
        //     profileInfo.name = document.querySelector('.pv-text-details__left-panel h1')?.innerText || null;
        //     profileInfo.headline = document.querySelector('.pv-text-details__left-panel h2')?.innerText || null;
        //     profileInfo.location = document.querySelector('.pv-text-details__left-panel .text-body-small')?.innerText || null;

        //     // Collecting current position
        //     profileInfo.currentPosition = document.querySelector('.pv-entity__summary-info h3')?.innerText || null;

        //     // Collecting education, experience, and other sections if needed
        //     const sections = Array.from(document.querySelectorAll('.pv-profile-section'));
        //     profileInfo.sections = sections.map(section => section.innerText);

        //     return profileInfo;
        // });

        // const result = await page.evaluate(() => {
        //     //.scaffold-layout__main
        //     const textCollected = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')).map(el => el.innerText);
        //     // const imgUrls = Array.from(document.querySelectorAll('img')).map(img => img.src);
        //     // return { textCollected, imgUrls };
        //     return textCollected;
        // });
        // const result = await page.evaluate(() => {
        //     const textCollected = Array.from(
        //         document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span, ul, li, a, section')
        //     ).map(el => el.innerText.trim()).filter(text => text.length > 0); // Filter out empty texts

        //     return textCollected;
        // });
        const result = await page.evaluate(() => {
            const mainDiv = document.querySelector('.scaffold-layout__main'); // Target the specific div
            if (!mainDiv) return []; // Return empty if the div is not found

            // Collect text from inside the mainDiv
            const textCollected = Array.from(
                mainDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span, ul, ol, li, a, section, article, blockquote')
            ).map(el => el.innerText.trim()).filter(text => text.length > 0); // Filter out empty texts
            // Remove duplicate texts using Set
            const uniqueText = Array.from(new Set(textCollected));
            const imgEl = mainDiv.querySelector('.pv-top-card__non-self-photo-wrapper img')
            const img = imgEl ? imgEl.src : '';
            uniqueText.push(img)
            return uniqueText;
        });
        console.log("Scraped profile info:", result);



        // Scrape relevant information
        // const profileInfo = await page.evaluate(() => {
        //     const profile = {};
        //     const mainDiv = document.querySelector('.scaffold-layout__main');

        //     // Scrape Name
        //     const nameElement = mainDiv.querySelector('h1.text-heading-xlarge');
        //     profile.name = nameElement ? nameElement.innerText : 'N/A';

        //     // Scrape Title
        //     const titleElement = mainDiv.querySelector('div.text-body-medium');
        //     profile.title = titleElement ? titleElement.innerText.trim() : 'N/A';

        //     const imgEl = mainDiv.querySelector('.pv-top-card__non-self-photo-wrapper img')
        //     profile.img = imgEl ? imgEl.src : '';


        //     // Scrape Location
        //     const locationElement = mainDiv.querySelector('span.text-body-small.inline');
        //     profile.location = locationElement ? locationElement.innerText.trim() : 'N/A';

        //     // Scrape Current Company
        //     const companyElement = mainDiv.querySelector('span.xIocYqgMyXjWEWaBtOICjmecgepVKPUQxavw');
        //     profile.currentCompany = companyElement ? companyElement.innerText.trim() : 'N/A';

        //     // Scrape About Section

        //     // const aboutSection = mainDiv.querySelector('section.pv-profile-card #text'); // Targeting the element after #about
        //     const aboutSection = Array.from(mainDiv.querySelectorAll('.artdeco-card.pv-profile-card span'))[2]; // Targeting the element after #about
        //     profile.about = aboutSection ? aboutSection.innerText.trim() : 'N/A';

        //     // Scrape Experience
        //     const experienceElements = mainDiv.querySelectorAll('li.artdeco-list__item');
        //     profile.experience = [];
        //     experienceElements.forEach(exp => {
        //         const jobTitle = exp.querySelector('div.t-bold');
        //         const company = exp.querySelector('span.t-14');
        //         const timePeriod = exp.querySelector('span.pvs-entity__caption-wrapper');
        //         const location = exp.querySelector('span.t-14.t-black--light');
        //         const details = exp.querySelector('div.inline-show-more-text');

        //         profile.experience.push({
        //             jobTitle: jobTitle ? jobTitle.innerText.trim() : 'N/A',
        //             company: company ? company.innerText.trim() : 'N/A',
        //             timePeriod: timePeriod ? timePeriod.innerText.trim() : 'N/A',
        //             location: location ? location.innerText.trim() : 'N/A',
        //             details: details ? details.innerText.trim() : 'N/A',
        //         });
        //     });

        //     return profile;
        // });

        // console.log(profileInfo);



        await browser.close();
        console.log("Browser closed");

        const end = Date.now();
        console.log(`Time in seconds: ${Math.floor((end - start) / 1000)}`);

        return result;
    } catch (error) {
        console.log("Error at extractLinkedInProfileInfo:", error.message);
        return "";//try empty array
    }
}


