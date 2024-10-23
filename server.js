import express from 'express'
import cors from 'cors'
import cron from 'node-cron';
import axios from 'axios';
import dotenv from "dotenv"; //import the dotenv

dotenv.config(); // add the config


import { loggerService } from './services/logger.service.js';
import { extractLinkedInProfileInfoLocaly, extractLinkedInProfileInfoTest, searchGoogleMaps } from './services/scrap.service.js';
import { extractGoogleWebsiteInfo, retriveResFromGoogle, searchGoogle, extractLinkedInProfileInfoBrightData } from './services/scrapInfo.service.js';

const app = express()


// App Configuration
const corsOptions = {
    origin: [
        '*',
        'http://127.0.0.1:8080',
        'http://localhost:8080',
        'http://127.0.0.1:5173',
        'http://localhost:5173',
    ],
    credentials: true
}

app.use(cors(corsOptions))
app.use(express.json()) // for req.body



app.post('/search-img', async (req, res) => {
    const { query } = req.body;
    console.log('query', query)
    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        const result = await searchGoogleMaps(query);
        res.json(result);
    } catch (error) {
        console.error('Error handling /search request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//route for search info for summary  
app.post('/search-info', async (req, res) => {
    const { query, addOnForSearch } = req.body;
    console.log('query', query)
    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }
    const modifySearchQuery = addOnForSearch ? query + ' ' + addOnForSearch : query

    try {
        const result = await searchGoogle(modifySearchQuery);
        res.json(result);
    } catch (error) {
        console.error('Error handling /search request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//route for search info by website url for summary  
app.post('/scrape-website-info', async (req, res) => {
    const { url } = req.body;
    console.log('url', url)
    if (!url) {
        return res.status(400).json({ error: 'url is required' });
    }

    try {
        const result = await extractGoogleWebsiteInfo(url);
        // const result = await extractLinkedInProfileInfo(url);
        res.json(result);
    } catch (error) {
        console.error('Error handling /search request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API endpoint to scrape LinkedIn profile using Puppeteer
app.post('/scrape-linkedin-profile', async (req, res) => {
    const { firstName, lastName, title, vname } = req.body;

    if (!firstName || !lastName || !title) {
        return res.status(400).json({ error: 'firstName, lastName, and title are required' });
    }

    try {
        // Call the LinkedIn scraping function with the provided details
        //test locally
        // const profileInfo = await extractLinkedInProfileInfoLocaly(firstName, lastName, title, vname);
        // const profileInfo = await extractLinkedInProfileInfoTest(firstName, lastName, title, vname);
        const profileInfo = await extractLinkedInProfileInfoBrightData(firstName, lastName, title, vname);

        if (!profileInfo) {
            return res.status(500).json({ error: 'Failed to scrape LinkedIn profile' });
        }

        // Return the scraped profile information
        return res.status(200).json(profileInfo);
    } catch (error) {
        console.error('Error scraping LinkedIn profile:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

//route for search info by website url for summary  
// app.post('/search-websites-info', async (req, res) => {
//     const { urls } = req.body;
//     console.log('urls', urls)
//     if (!urls) {
//         return res.status(400).json({ error: 'urls is required' });
//     }

//     try {
//         const result = await extractGoogleWebsitesInfo(urls);
//         res.json(result);
//     } catch (error) {
//         console.error('Error handling /search request:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

//retrive res from google route
app.post('/get-res-from-google', async (req, res) => {
    const { searchQuery, num } = req.body;

    try {
        const result = await retriveResFromGoogle(searchQuery, num);
        res.json(result);
    } catch (error) {
        console.error('Error handling /search request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// (async () => {
//     console.log('run search on google')
//     // const webs = await searchGoogle('accessibility in tourism')
//     const webs = await searchGoogle('machu picchu accessibility for disabled travellers')
//     console.log('webs', webs)
// })().catch(err => {
//     console.error(err);
// });


app.get('/wake-up', (req, res) => {
    console.log('Service is awake and working');
    res.send('Service is awake and working');
});

// Wake-up task to keep the service active
cron.schedule('*/13 * * * *', async () => {
    try {
        console.log('Wake-up task running');
        //test
        // await axios.get(`https://search-google-map-img.onrender.com/wake-up`);
        await axios.get(`https://scraper-test-5w1x.onrender.com/wake-up`);
        // await axios.get(`https://scraper-test-production.up.railway.app/wake-up`);
    } catch (error) {
        console.error('Error during wake-up task:', error);
    }
});


//TODO: add this line 
const port = process.env.PORT || 3060
app.listen(port, () => {
    loggerService.info(`Server listening on port http://127.0.0.1:${port}/`)
})