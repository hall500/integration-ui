const express = require('express');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({});

const app = express();
const PORT = 5500;

const apiUrl = process.env.API_URL;
const token = process.env.TOKEN;
const workstationId = process.env.WORKSTATION_ID;

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));


app.get('/', (req, res) => {
    return res.render('index', { title: 'Home Page' });
});

app.get('/auth/:provider', async (req, res) => {
    const { provider } = req.params;
    if(['asana', 'linear', 'jira', 'basecamp'].includes(provider)){
        return res.render('error', { title: 'Failed Import', message: `${provider} import is coming soon` });
    }

    if (['trello', 'discord', 'slack', 'notion'].includes(provider)) {
        try {
            const { data } = await axios.get(`${apiUrl}/v1/integrations/connect/${provider}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-workstation-id': workstationId
                }
            });
            return res.redirect(data);
        } catch (error) {
            const errorResponse = error?.response?.data || 'Invalid error';
            return res.render('error', { title: 'Invalid Import', message: errorResponse?.data?.message || `Failed to get Integration URL for Import Type ${provider}.` });
        }
    }

    return res.render('error', { title: 'Invalid Import', message: `Invalid Import Type ${provider}` });
});

// Serve callback.html at /callback
app.get('/callback/:provider', async (req, res) => {
    try {
        const { provider } = req.params;
        const urlParams = new URLSearchParams(req.query);
        const hashParams = new URLSearchParams(req.query.hash || '');
        const params = `${urlParams.toString()}${urlParams.toString() && hashParams.toString() ? '&' : ''}${hashParams.toString()}`;

        await axios.get(`${apiUrl}/v1/integrations/${provider}?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-workstation-id': workstationId
            }
        });

        const { data } = await axios.get(`${apiUrl}/v1/imports/oauth?provider=${provider}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-workstation-id': workstationId
            }
        });

        return res.render('success', { title: 'Import Processing', message: 'Connection successful! Import has started. You will be notified when the importation is complete.' });
    } catch (error) {
        const errorResponse = error?.response?.data || 'Invalid error';
            console.error('Error:', errorResponse);
        return res.render('error', { title: 'Invalid Callback', message: `Error: ${errorResponse?.data?.message}` || 'An error occurred during processing.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});