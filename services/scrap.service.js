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
