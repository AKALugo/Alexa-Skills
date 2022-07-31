/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
  
const Alexa = require('ask-sdk-core');
 
const logic = require('./logic');
const interceptors = require('./interceptors');
const persistence = require('./persistence');
 
const fetch = require('node-fetch');

const GIVEN_NAME_PERMISSION = ['alexa::profile:given_name:read'];
const REMINDERS_PERMISSION = ['alexa::alerts:reminders:skill:readwrite'];

// Variables globales.
var name; // Lo obtenemos con la API de ask.
var datos;
var seleccion = false;
// Usamos memoria y persistencia.
var favorito = false;
var odiado = false;

// API de ask
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        const {attributesManager, serviceClientFactory, requestEnvelope} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        
        try {
            const {permissions} = requestEnvelope.context.System.user;
            
            if(!permissions) throw {statusCode: 401, message: 'No permissions available'}; // there are zero permissions, no point in intializing the API
            
            const upsServiceClient = serviceClientFactory.getUpsServiceClient();
            const profileName = await upsServiceClient.getProfileGivenName();
            
            if (profileName) name = profileName; 
        }
            catch (error) {
                console.log(JSON.stringify(error));
                if (error.statusCode === 401 || error.statusCode === 403) {
                  handlerInput.responseBuilder.withAskForPermissionsConsentCard(GIVEN_NAME_PERMISSION);
                }
            }
        const speakOutput = requestAttributes.t('WELCOME_MSG', name);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};



const DatosPersonajeIntent = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'DatosPersonajeIntent';
    },
    async handle(handlerInput) {
        const NameValue = handlerInput.requestEnvelope.request.intent.slots.nombre.value;
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        datos = [];
        seleccion = false;
        favorito = false;
        odiado = false;
        
        let info;
        let count;
        await fetch('https://rickandmortyapi.com/api/character/?name=' + NameValue)
            .then(response => response.json())
            .then((data) => {
                datos = data.results;
                info = data.info.pages;
                count = data.info.count;
            }) 
            .catch(error => console.log(error))
        
        let aux;
        if (info)
            for (let step = 2; step <= Number(info); step++) {
            await fetch('https://rickandmortyapi.com/api/character?page=' + step.toString() + '&name=' + NameValue)
                .then(response => response.json())
                .then(data => aux = data.results)
                .catch(error => console.log(error))
                datos = datos.concat(aux);
            }
        
        let speakOutput;
        
        if (!count) {
            count = 0;
            speakOutput = requestAttributes.t('NODATOS_MSG',count.toString(), NameValue);
        }
        if (count === 1) {
            speakOutput =  requestAttributes.t('PERSONAJE1_MSG') + datos[0].name + requestAttributes.t('PERSONAJE2_MSG');
            speakOutput += requestAttributes.t('SPECIES_MSG') + datos[0].species + ' ,';
            speakOutput += requestAttributes.t('STATUS_MSG') + datos[0].status + ' ,';
            speakOutput += requestAttributes.t('GENDER_MSG') + datos[0].gender + ' ,';
            speakOutput += requestAttributes.t('ORIGIN_MSG') + datos[0].origin.name + ' ,';
            speakOutput += requestAttributes.t('LOCATION_MSG') + datos[0].location.name + ' ;';
        }
        if (count > 1) {
            speakOutput = requestAttributes.t('DATOS_MSG',count.toString(), NameValue);
            seleccion = true;
            for (var i = 0; i < datos.length; i++)
                speakOutput += ' ' + datos[i].name + ' ,';
            speakOutput += requestAttributes.t('LISTA_MSG');
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};



const EleccionPersonajeIntent = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'EleccionPersonajeIntent';
    },
    async handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        let speakOutput;

        if (seleccion) {
            const Value = handlerInput.requestEnvelope.request.intent.slots.numero.value;
            if (Value > 0 && Value <= datos.length) {
                speakOutput = requestAttributes.t('DATOS1_MSG');
                speakOutput += ' ' + datos[Value -1].name;
                speakOutput += requestAttributes.t('SPECIES_MSG') + datos[Value -1].species + ' ,';
                speakOutput += requestAttributes.t('STATUS_MSG') + datos[Value -1].status + ' ,';
                speakOutput += requestAttributes.t('GENDER_MSG') + datos[Value -1].gender + ' ,';
                speakOutput += requestAttributes.t('ORIGIN_MSG') + datos[Value -1].origin.name + ' ,';
                speakOutput += requestAttributes.t('LOCATION_MSG') + datos[Value -1].location.name + ' ;';
            }
            else speakOutput = requestAttributes.t('ERRORINDICE1_MSG');
        }
        else speakOutput = requestAttributes.t('ERRORINDICE_MSG');
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};



const RemindEpisodioIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'RemindEpisodioIntent';
    },
    async handle(handlerInput) {
        const {attributesManager, serviceClientFactory, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const {intent} = handlerInput.requestEnvelope.request;

        const message = intent.slots.message.value;

        if (intent.confirmationStatus !== 'CONFIRMED') {

            return handlerInput.responseBuilder
                .speak(handlerInput.t('CANCEL_MSG') + handlerInput.t('HELP_MSG'))
                .reprompt(handlerInput.t('HELP_MSG'))
                .getResponse();
        }
        
        let speechText;
            const deviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
            // let's try to get the timezone via the UPS API
            // (no permissions required but it might not be set up)
            let timezone;
            try {
                const upsServiceClient = serviceClientFactory.getUpsServiceClient();
                timezone = await upsServiceClient.getSystemTimeZone(deviceId);
            } catch (error) {
                return handlerInput.responseBuilder
                    .speak(handlerInput.t('NO_TIMEZONE_MSG'))
                    .getResponse();
            }
            console.log('Got timezone: ' + timezone);

            // let's try to create a reminder via the Reminders API
            // don't forget to enable this permission in your skill configuratiuon (Build tab -> Permissions)
            // or you'll get a SessionEnndedRequest with an ERROR of type INVALID_RESPONSE
            try {
                const {permissions} = requestEnvelope.context.System.user;
                if(!permissions)
                    throw { statusCode: 401, message: 'No permissions available' }; // there are zero permissions, no point in intializing the API
                    
                const reminderServiceClient = serviceClientFactory.getReminderManagementServiceClient();
                // reminders are retained for 3 days after they 'remind' the customer before being deleted
                const remindersList = await reminderServiceClient.getReminders();
                
                console.log('Current reminders: ' + JSON.stringify(remindersList));
                console.log(JSON.stringify(remindersList));
                // delete previous reminder if present
                const previousReminder = sessionAttributes['reminderId'];
                if(previousReminder){
                    await reminderServiceClient.deleteReminder(previousReminder);
                    delete sessionAttributes['reminderId'];
                    console.log('Deleted previous reminder with token: ' + previousReminder);
                }
                
                // create reminder structure
                const reminder = logic.createReminderData(
                    timezone,
                    requestEnvelope.request.locale,
                    message);
                    
                const reminderResponse = await reminderServiceClient.createReminder(reminder); // the response will include an "alertToken" which you can use to refer to this reminder
                // save reminder id in session attributes
                sessionAttributes['reminderId'] = reminderResponse.alertToken;
                console.log('Reminder created with token: ' + reminderResponse.alertToken);
                speechText = handlerInput.t('REMINDER_CREATED_MSG') + handlerInput.t('HELP_MSG');
            } catch (error) {
                console.log(JSON.stringify(error));
                switch (error.statusCode) {
                    case 401: // the user has to enable the permissions for reminders, let's attach a permissions card to the response
                        handlerInput.responseBuilder.withAskForPermissionsConsentCard(REMINDERS_PERMISSION);
                        speechText = handlerInput.t('MISSING_PERMISSION_MSG') + handlerInput.t('HELP_MSG');
                        break;
                    case 403: // devices such as the simulator do not support reminder management
                        speechText = handlerInput.t('UNSUPPORTED_DEVICE_MSG') + handlerInput.t('HELP_MSG');
                        break;
                    default:
                        speechText = handlerInput.t('REMINDER_ERROR_MSG') + handlerInput.t('HELP_MSG');
                }
            }
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('HELP_MSG'))
            .getResponse();
    }
};



const ConsultarPersonajeFavoritoIntent = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConsultarPersonajeFavoritoIntent';
    },
    async handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        datos = [];
        seleccion = false;
        favorito = false;
        odiado = false;
        
        let speakOutput;
        const aux = sessionAttributes['fav'];
        
        if(aux) {
            
            speakOutput =  aux.name + requestAttributes.t('CONSULTAFAVORITO_MSG');
            speakOutput += requestAttributes.t('SPECIES_MSG') + aux.species + ' ,';
            speakOutput += requestAttributes.t('STATUS_MSG') + aux.status + ' ,';
            speakOutput += requestAttributes.t('GENDER_MSG') + aux.gender + ' ,';
            speakOutput += requestAttributes.t('ORIGIN_MSG') + aux.origin.name + ' ,';
            speakOutput += requestAttributes.t('LOCATION_MSG') + aux.location.name + ' ;';
        }
        else {
            speakOutput = requestAttributes.t('NOCONSULTAFAVORITO_MSG');
        }
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};



const ConsultarPersonajeNoFavoritoIntent = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConsultarPersonajeNoFavoritoIntent';
    },
    async handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        datos = [];
        seleccion = false;
        favorito = false;
        odiado = false;
        
        let speakOutput;
        const aux = sessionAttributes['odi'];
        
        if(aux) {
            
            speakOutput =  aux.name + requestAttributes.t('CONSULTANOFAVORITO_MSG');
            speakOutput += requestAttributes.t('SPECIES_MSG') + aux.species + ' ,';
            speakOutput += requestAttributes.t('STATUS_MSG') + aux.status + ' ,';
            speakOutput += requestAttributes.t('GENDER_MSG') + aux.gender + ' ,';
            speakOutput += requestAttributes.t('ORIGIN_MSG') + aux.origin.name + ' ,';
            speakOutput += requestAttributes.t('LOCATION_MSG') + aux.location.name + ' ;';
        }
        else {
            speakOutput = requestAttributes.t('NOCONSULTANOFAVORITO_MSG');
        }
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};


const PersonajeFavoritoIntent = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PersonajeFavoritoIntent';
    },
    async handle(handlerInput) {
        const NameValue = handlerInput.requestEnvelope.request.intent.slots.personaje.value;
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        datos = [];
        seleccion = false;
        favorito = false;
        odiado = false;
        
        let info;
        let count;
        await fetch('https://rickandmortyapi.com/api/character/?name=' + NameValue)
            .then(response => response.json())
            .then((data) => {
                datos = data.results;
                info = data.info.pages;
                count = data.info.count;
            }) 
            .catch(error => console.log(error))
        
        let aux;
        if (info)
            for (let step = 2; step <= Number(info); step++) {
            await fetch('https://rickandmortyapi.com/api/character?page=' + step.toString() + '&name=' + NameValue)
                .then(response => response.json())
                .then(data => aux = data.results)
                .catch(error => console.log(error))
                datos = datos.concat(aux);
            }

        let speakOutput;
        
        if (!count) {
            count = 0;
            speakOutput = requestAttributes.t('NODATOS_MSG',count.toString(), NameValue);
        }

        if (count === 1) {
            speakOutput = requestAttributes.t('FAVORITO1_MSG') + datos[0].name + requestAttributes.t('FAVORITO2_MSG');
            sessionAttributes['fav'] = datos[0];
            }
        if (count > 1) {
            speakOutput = requestAttributes.t('DATOS_MSG',count.toString(), NameValue);
            favorito = true;
            for (var i = 0; i < datos.length; i++)
                speakOutput += ' ' + datos[i].name + ' ,';
            speakOutput += requestAttributes.t('LISTAFAVORITO_MSG');
        }

        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};


const PersonajeNoFavoritoIntent = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PersonajeNoFavoritoIntent';
    },
    async handle(handlerInput) {
        const NameValue = handlerInput.requestEnvelope.request.intent.slots.personaje.value;
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        datos = [];
        seleccion = false;
        favorito = false;
        odiado = false;
        
        let info;
        let count;
        await fetch('https://rickandmortyapi.com/api/character/?name=' + NameValue)
            .then(response => response.json())
            .then((data) => {
                datos = data.results;
                info = data.info.pages;
                count = data.info.count;
            }) 
            .catch(error => console.log(error))
        
        let aux;
        if (info)
            for (let step = 2; step <= Number(info); step++) {
            await fetch('https://rickandmortyapi.com/api/character?page=' + step.toString() + '&name=' + NameValue)
                .then(response => response.json())
                .then(data => aux = data.results)
                .catch(error => console.log(error))
                datos = datos.concat(aux);
            }

        let speakOutput;
        
        if (!count) {
            count = 0;
            speakOutput = requestAttributes.t('NODATOS_MSG',count.toString(), NameValue);
        }

        if (count === 1) {
            speakOutput = requestAttributes.t('FAVORITO1_MSG') + datos[0].name + requestAttributes.t('NOFAVORITO_MSG');
            sessionAttributes['odi'] = datos[0];
            }
        if (count > 1) {
            speakOutput = requestAttributes.t('DATOS_MSG',count.toString(), NameValue);
            odiado = true;
            for (var i = 0; i < datos.length; i++)
                speakOutput += ' ' + datos[i].name + ' ,';
            speakOutput += requestAttributes.t('NOLISTAFAVORITO_MSG');
        }

        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};


const PersonajeFavoritoListaIntent = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PersonajeFavoritoListaIntent';
    },
    async handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        let speakOutput;

        if (favorito) {
            const Value = handlerInput.requestEnvelope.request.intent.slots.numero.value;
            if (Value > 0 && Value <= datos.length) {
            speakOutput = requestAttributes.t('FAVORITO1_MSG') + datos[Value - 1].name + requestAttributes.t('FAVORITO2_MSG');
            sessionAttributes['fav'] = datos[Value - 1];
            }
            else speakOutput = requestAttributes.t('ERRORINDICE1_MSG');
        }
        else speakOutput = requestAttributes.t('ERRORINDICE_MSG');
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};


const PersonajeNoFavoritoListaIntent = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PersonajeNoFavoritoListaIntent';
    },
    async handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        let speakOutput;

        if (odiado) {
            const Value = handlerInput.requestEnvelope.request.intent.slots.numero.value;
            if (Value > 0 && Value <= datos.length) {
            speakOutput = requestAttributes.t('FAVORITO1_MSG') + datos[Value - 1].name + requestAttributes.t('NOFAVORITO_MSG');
            sessionAttributes['odi'] = datos[Value - 1];
            }
            else speakOutput = requestAttributes.t('ERRORINDICE1_MSG');
        }
        else speakOutput = requestAttributes.t('ERRORINDICE_MSG');
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};



const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        
        const speakOutput = requestAttributes.t('AYUDA_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};


const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        
        const speakOutput =  requestAttributes.t('ADIOS_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        RemindEpisodioIntentHandler,
        DatosPersonajeIntent,
        PersonajeFavoritoIntent,
        PersonajeNoFavoritoIntent,
        ConsultarPersonajeNoFavoritoIntent,
        ConsultarPersonajeFavoritoIntent,
        EleccionPersonajeIntent,
        PersonajeFavoritoListaIntent,
        PersonajeNoFavoritoListaIntent,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .addRequestInterceptors(
        interceptors.LocalizationInterceptor,
        interceptors.LoggingRequestInterceptor,
        interceptors.LoadAttributesRequestInterceptor)
    .addResponseInterceptors(
        interceptors.LoggingResponseInterceptor,
        interceptors.SaveAttributesResponseInterceptor)
    .withPersistenceAdapter(persistence.getPersistenceAdapter())
    .withCustomUserAgent('sample/hello-world/v1.2')
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();
    
    //RemindEpisodioIntentHandler,