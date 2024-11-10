import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import apiResponses from './common/apiResponses';
import * as AWS from 'aws-sdk'
import { Translate } from 'aws-sdk';

const translate = new AWS.Translate();

export const handler: APIGatewayProxyHandler = async (event) => {
    if (!event.body) {
        return apiResponses._400({ message: 'Missing request body' });
    }

    let body: { text: string; language: string };

    try {
        body = JSON.parse(event.body);
    } catch (error) {
        return apiResponses._400({ message: 'Invalid JSON in the body' });
    }

    const { text, language } = body;

    if (!text) {
        return apiResponses._400({ message: 'Missing text from the body' });
    }
    if (!language) {
        return apiResponses._400({ message: 'Missing language from the body' });
    }

    try {
        const translateParams: Translate.Types.TranslateTextRequest = {
            Text: text,
            SourceLanguageCode: 'en',
            TargetLanguageCode: language,
        };

        const translatedMessage = await translate.translateText(translateParams).promise();
        return apiResponses._200({ translatedMessage });
    } catch (error) {
        console.log('Error in translation', error);
        return apiResponses._400({ message: 'Unable to translate the message' });
    }
};
