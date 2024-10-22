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

export async function searchGoogleMaps(searchQuery) {
    // const query = encodeURIComponent(searchQuery);
    const query = searchQuery.split(" ").join("+");
    const userAgent = selectRandomUserAgent();
    try {
        const start = Date.now();

        const browser = await puppeteer.launch({
            headless: true,
            executablePath:
                process.env.NODE_ENV === "production"
                    ? process.env.PUPPETEER_EXECUTABLE_PATH
                    : puppeteer.executablePath(),
        });

        const page = await browser.newPage();
        const url = `https://www.google.com/maps/search/${query}`;
        console.log("url", url);
        try {
            // await page.goto(url);
            await page.setUserAgent(userAgent);
            await page.goto(url, { waitUntil: "domcontentloaded" });
        } catch (error) {
            console.log("Error going to page:", error);
        }
        // Wait for the image with src starting with "https://lh5"
        try {
            await page.waitForSelector('img[src^="https://lh5"]', { timeout: 10000 });
        } catch (error) {
            console.log("Specific image not found within the timeout period:", error);
        }

        // Evaluate the content within the browser context
        const result = await page.evaluate(() => {
            const aTags = Array.from(document.querySelectorAll('a'));
            const parents = [];

            aTags.forEach(el => {
                const href = el.getAttribute('href');
                if (href && href.includes("/maps/place/")) {
                    parents.push(el.parentElement);
                }
            });

            const main = document.querySelector('div[role="main"]');
            const image1 = main.querySelector("button img")?.getAttribute("src");
            let image2 = main.querySelector("img")?.getAttribute("src");

            // Find the first image with src starting with "https://lh5"
            const specificImage = document.querySelector('img[src^="https://lh5"]');
            image2 = specificImage ? specificImage.getAttribute("src") : image2;

            // Get all image src attributes
            const els = document.querySelectorAll('img[src]');
            const imgs = Array.from(els);
            const imgUrls = imgs.map(img => img.currentSrc);
            console.log('imgUrls', imgUrls)

            return {
                parentsCount: parents.length,
                image1,
                image2,
                imgUrls
            };
        });
        console.log('resulat', result)



        async function autoScroll(page) {
            await page.evaluate(async () => {
                const wrapper = document.querySelector('div[role="feed"]');
                if (!wrapper) return;
                await new Promise((resolve, reject) => {
                    var totalHeight = 0;
                    var distance = 1000;
                    var scrollDelay = 3000;

                    var timer = setInterval(async () => {
                        var scrollHeightBefore = wrapper.scrollHeight;
                        wrapper.scrollBy(0, distance);
                        totalHeight += distance;

                        if (totalHeight >= scrollHeightBefore) {
                            totalHeight = 0;
                            await new Promise((resolve) =>
                                setTimeout(resolve, scrollDelay),
                            );

                            var scrollHeightAfter = wrapper.scrollHeight;

                            if (scrollHeightAfter > scrollHeightBefore) {
                                return;
                            } else {
                                clearInterval(timer);
                                resolve();
                            }
                        }
                    }, 200);
                });
            });
        }

        // await autoScroll(page);

        const html = await page.content();

        await browser.close();
        console.log("Browser closed");

        const $ = cheerio.load(html);
        const aTags = $("a");
        // console.log('aTags', aTags)
        const parents = [];
        aTags.each((i, el) => {
            const href = $(el).attr("href");
            if (href && href.includes("/maps/place/")) {
                parents.push($(el).parent());
            }
        });

        console.log("parents", parents.length);
        const main = $('div[role="main"]');
        const image1 = main.find("button img").attr("src");
        let image2 = main.find("img").attr("src");
        // Find the first image with src starting with 
        console.log("image1", image1);
        console.log("image2", image2);
        const specificImage = $('img[src^="https://lh5"]');
        image2 = specificImage.attr("src");
        console.log('image2 after ', image2)
        const els = $('img[src]');
        const imgUrls = els.map((i, el) => $(el).attr('src')).get();
        console.log('imgUrls ch', imgUrls)

        const businesses = [];

        parents.forEach((parent) => {
            const url = parent.find("a").attr("href");
            const website = parent.find('a[data-value="Website"]').attr("href");
            const storeName = parent.find("div.fontHeadlineSmall").text();
            const ratingText = parent
                .find("span.fontBodyMedium > span")
                .attr("aria-label");

            const bodyDiv = parent.find("div.fontBodyMedium").first();
            const children = bodyDiv.children();
            const lastChild = children.last();
            const firstOfLast = lastChild.children().first();
            const lastOfLast = lastChild.children().last();

            const imageSrc = parent
                .find('button[aria-label*="Photo of"] img')
                .attr("src");
            const wheelchairAccessible = !!parent.find(
                'span[aria-label*="Wheelchair"]',
            );

            businesses.push({
                placeId: `ChI${url?.split("?")?.[0]?.split("ChI")?.[1]}`,
                address: firstOfLast?.text()?.split("·")?.[1]?.trim(),
                category: firstOfLast?.text()?.split("·")?.[0]?.trim(),
                phone: lastOfLast?.text()?.split("·")?.[1]?.trim(),
                googleUrl: url,
                bizWebsite: website,
                storeName,
                ratingText,
                stars: ratingText?.split("stars")?.[0]?.trim()
                    ? Number(ratingText?.split("stars")?.[0]?.trim())
                    : null,
                numberOfReviews: ratingText
                    ?.split("stars")?.[1]
                    ?.replace("Reviews", "")
                    ?.trim()
                    ? Number(
                        ratingText
                            ?.split("stars")?.[1]
                            ?.replace("Reviews", "")
                            ?.trim(),
                    )
                    : null,
                imageSrc,
                wheelchairAccessible,
            });
        });

        const end = Date.now();
        console.log(`Time in seconds: ${Math.floor((end - start) / 1000)}`);
        return { businesses, image1, image2 };
    } catch (error) {
        console.log("Error at googleMaps:", error.message);
    }
}


export async function extractLinkedInProfileInfoLocaly(firstName, lastName, title, vname) {
    const userAgent = selectRandomUserAgent(); // Select a random user agent
    try {
        const start = Date.now();

        const browser = await puppeteer.launch({
            headless: false, // Set this to false if you want see it run on browser
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
        });


        const page = await browser.newPage();
        await page.setUserAgent(userAgent);

        // Increase the timeout globally
        // page.setDefaultNavigationTimeout(150000); // 120 seconds
        // page.setDefaultTimeout(150000); // 120 seconds for selectors

        // 1. Go to LinkedIn login page
        await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
        // await page.goto('https://www.linkedin.com/in/tommcclelland/#main-content', { waitUntil: 'domcontentloaded' });
        // await page.goto('https://www.linkedin.com/in/tommcclelland/#main-content');
        console.log('login loaded')

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
        await page.waitForSelector('.search-global-typeahead__input', { timeout: 30000 });
        // // await page.waitForSelector('[class*="search-global-typeahead__input"]', { timeout: 200000 });
        // console.log('global search visible')


        // // 3. Search for the user
        console.log('`${firstName} ${lastName} ${title}`', `${firstName} ${lastName} ${title}`)
        const searchQuery = `${firstName} ${lastName} ${title}`;
        await page.type('.search-global-typeahead__input', searchQuery); // Search in LinkedIn search box
        await page.keyboard.press('Enter');

        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.search-results-container', { timeout: 120000 });

        // // 4. Click on the first search result (profile)
        //test modal dissmis click
        // await page.click('.modal__dismiss'); // Click on the first result
        await page.click('.search-results-container a'); // Click on the first result
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.scaffold-layout__main', { timeout: 120000 });
        await page.waitForSelector('.pv-profile-card', { timeout: 20000 });
        // await page.waitForSelector('#about', { timeout: 20000 });
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

        ///worked ish
        // const result = await page.evaluate(() => {
        //     //.scaffold-layout__main
        //     const textCollected = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')).map(el => el.innerText);
        //     // const imgUrls = Array.from(document.querySelectorAll('img')).map(img => img.src);
        //     // return { textCollected, imgUrls };
        //     return textCollected;
        // });
        // console.log('result', result)

        // const result = await page.evaluate(() => {
        //     const textCollected = Array.from(
        //         document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span, ul, li, a, section')
        //     ).map(el => el.innerText.trim()).filter(text => text.length > 0); // Filter out empty texts

        //     return textCollected;
        // });
        //tset here 
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
            const imgEl2 = document.querySelector('.contextual-sign-in-modal__img')
            const img = imgEl ? imgEl.src : imgEl2.src;
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

export async function extractLinkedInProfileInfoTest(firstName, lastName, title, vname) {
    const userAgent = selectRandomUserAgent(); // Select a random user agent
    try {
        const start = Date.now();

        const browser = await puppeteer.launch({
            headless: false, // Set this to false if you want see it run on browser
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
        });


        const page = await browser.newPage();
        await page.setUserAgent(userAgent);

        // Increase the timeout globally
        // page.setDefaultNavigationTimeout(150000); // 120 seconds
        // page.setDefaultTimeout(150000); // 120 seconds for selectors

        // 1. Go to LinkedIn login page
        await page.goto(`https://www.linkedin.com/in/${vname}/#main-content`);
        // await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
        // await page.goto('https://www.linkedin.com/in/tommcclelland/#main-content', { waitUntil: 'domcontentloaded' });
        // await page.goto('https://www.linkedin.com/in/tommcclelland/#main-content');
        console.log('login loaded')

        // 2. Login with credentials
        // await page.type('#username', process.env.LINKEDIN_EMAIL); // Your LinkedIn email
        // await page.type('#password', process.env.LINKEDIN_PASSWORD); // Your LinkedIn password
        // await page.click('button[type="submit"]');
        // // await page.waitForNavigation({ waitUntil: 'networkidle0' });

        // console.log("Logged in to LinkedIn");

        // // 3. Wait for navigation to the homepage
        // // await page.waitForNavigation({ waitUntil: 'networkidle2' });
        // await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        // console.log("linkedin page loaded");



        // // 4. Ensure the search bar is visible and ready
        // await page.waitForSelector('.search-global-typeahead__input', { timeout: 30000 });
        // // // await page.waitForSelector('[class*="search-global-typeahead__input"]', { timeout: 200000 });
        // // console.log('global search visible')


        // // // 3. Search for the user
        // console.log('`${firstName} ${lastName} ${title}`', `${firstName} ${lastName} ${title}`)
        // const searchQuery = `${firstName} ${lastName} ${title}`;
        // await page.type('.search-global-typeahead__input', searchQuery); // Search in LinkedIn search box
        // await page.keyboard.press('Enter');

        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        // await page.waitForSelector('.search-results-container', { timeout: 120000 });

        // // 4. Click on the first search result (profile)
        //test modal dissmis click
        await page.click('.modal__dismiss'); // Click on the first result
        // await page.click('.search-results-container a'); // Click on the first result
        // await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        // await page.waitForSelector('.scaffold-layout__main', { timeout: 120000 });
        // await page.waitForSelector('.pv-profile-card', { timeout: 20000 });
        // await page.waitForSelector('#about', { timeout: 20000 });
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

        ///worked ish
        // const result = await page.evaluate(() => {
        //     //.scaffold-layout__main
        //     const textCollected = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')).map(el => el.innerText);
        //     // const imgUrls = Array.from(document.querySelectorAll('img')).map(img => img.src);
        //     // return { textCollected, imgUrls };
        //     return textCollected;
        // });
        // console.log('result', result)

        // const result = await page.evaluate(() => {
        //     const textCollected = Array.from(
        //         document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span, ul, li, a, section')
        //     ).map(el => el.innerText.trim()).filter(text => text.length > 0); // Filter out empty texts

        //     return textCollected;
        // });
        //tset here 
        const result = await page.evaluate(() => {
            // const mainDiv = document.querySelector('.scaffold-layout__main'); // Target the specific div
            // if (!mainDiv) return []; // Return empty if the div is not found

            // Collect text from inside the mainDiv
            const textCollected = Array.from(
                document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span, ul, ol, li, a, section, article, blockquote')
            ).map(el => el.innerText.trim()).filter(text => text.length > 0); // Filter out empty texts
            // Remove duplicate texts using Set
            const uniqueText = Array.from(new Set(textCollected));
            const imgEl = document.querySelector('.pv-top-card__non-self-photo-wrapper img')
            const imgEl2 = document.querySelector('.contextual-sign-in-modal__img')
            const img = imgEl ? imgEl.src : imgEl2.src;
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
