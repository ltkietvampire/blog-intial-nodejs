const SystemConfigService = require('../services/SystemConfigService');

const chatbotConfigMiddleware = async (req, res, next) => {
  try {
    const enabled = await SystemConfigService.getConfig('chatbotEnabled', false);
    
    if (enabled) {
      res.locals.chatbotConfig = {
        enabled: true,
        webhookUrl: await SystemConfigService.getConfig('chatbotWebhookUrl', ''),
        themeColor: await SystemConfigService.getConfig('chatbotThemeColor', '#1E40AF'),
        title: await SystemConfigService.getConfig('chatbotTitle', 'Trợ lý AI'),
        welcomeMessage: await SystemConfigService.getConfig('chatbotWelcomeMessage', 'Xin chào! Tôi có thể giúp gì cho bạn?'),
        position: await SystemConfigService.getConfig('chatbotPosition', 'bottom-right')
      };
    } else {
      res.locals.chatbotConfig = { enabled: false };
    }
  } catch (error) {
    console.error('Error loading chatbot config:', error);
    res.locals.chatbotConfig = { enabled: false };
  }
  
  next();
};

module.exports = chatbotConfigMiddleware;
