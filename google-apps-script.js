
// Email da sua agenda do Google
var CALENDAR_EMAIL = 'dyh.silva.barbosa@gmail.com'; 
// Chave para armazenar a configuração
var CONFIG_KEY = 'APP_CONFIG_V1';

// Função principal para requisições GET (quando o navegador busca informações)
function doGet(e) {
  var action = e.parameter.action;

  if (action == 'getEvents') {
    // Retorna os eventos de um dia específico
    var date = e.parameter.date;
    return getCalendarEvents(date);
  }
  
  if (action == 'getConfig') {
    // Retorna a configuração salva (serviços, avisos, etc.)
    return getAppConfig();
  }

  // Se nenhuma ação for especificada, retorna uma resposta padrão.
  return ContentService.createTextOutput("Script Ativo.").setMimeType(ContentService.MimeType.TEXT);
}

// Função principal para requisições POST (quando o app envia informações)
function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;

    if (action == 'createEvent') {
      // Cria um novo evento na agenda
      return createCalendarEvent(requestData.payload);
    }
    
    if (action == 'saveConfig') {
      // Salva a nova configuração do app
      return saveAppConfig(requestData.config);
    }

    // Se a ação for desconhecida
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Ação desconhecida' })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Em caso de erro
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ---- FUNÇÕES DE LÓGICA ----

// Pega os eventos de um dia específico na agenda
function getCalendarEvents(dateString) {
  var calendar = CalendarApp.getCalendarById(CALENDAR_EMAIL);
  if (!calendar) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Calendário não encontrado' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var date = new Date(dateString);
  var events = calendar.getEventsForDay(date);
  
  var occupiedSlots = events.map(function(event) {
    var startTime = event.getStartTime();
    var endTime = event.getEndTime();
    var duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    
    return {
      time: ('0' + startTime.getHours()).slice(-2) + ':' + ('0' + startTime.getMinutes()).slice(-2),
      duration: duration
    };
  });
  
  return ContentService.createTextOutput(JSON.stringify({ events: occupiedSlots })).setMimeType(ContentService.MimeType.JSON);
}

// Cria um evento na agenda
function createCalendarEvent(payload) {
  var calendar = CalendarApp.getCalendarById(CALENDAR_EMAIL);
  var startTime = new Date(payload.start);
  var endTime = new Date(startTime.getTime() + payload.duration * 60000); // duração em milissegundos
  
  calendar.createEvent(payload.summary, startTime, endTime, {
    description: payload.description
  });
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
}

// Salva a configuração do app (serviços, avisos, recesso)
function saveAppConfig(config) {
  try {
    var properties = PropertiesService.getScriptProperties();
    properties.setProperty(CONFIG_KEY, JSON.stringify(config));
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Falha ao salvar configuração: ' + error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Pega a configuração salva do app
function getAppConfig() {
  try {
    var properties = PropertiesService.getScriptProperties();
    var configString = properties.getProperty(CONFIG_KEY);
    
    if (configString) {
      // Se encontrou uma configuração salva, retorna ela
      return ContentService.createTextOutput(configString).setMimeType(ContentService.MimeType.JSON);
    } else {
      // Se não, retorna um objeto vazio
      return ContentService.createTextOutput(JSON.stringify({})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
     return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Falha ao buscar configuração: ' + error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
