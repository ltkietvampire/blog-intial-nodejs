const SystemConfigService = require('../services/SystemConfigService');
const AuditService = require('../services/AuditService');
const User = require('../model/user');
const asyncHandler = require('express-async-handler');

class AdminController {
  
  configPage = asyncHandler(async (req, res) => {
    const maxWorkingHours = await SystemConfigService.getConfig('maxWorkingHours', 8);
    const maintenanceMode = await SystemConfigService.getConfig('maintenanceMode', false);
    const holidays = await SystemConfigService.getConfig('holidays', '');

    const chatbotEnabled = await SystemConfigService.getConfig('chatbotEnabled', false);
    const chatbotWebhookUrl = await SystemConfigService.getConfig('chatbotWebhookUrl', '');
    const chatbotThemeColor = await SystemConfigService.getConfig('chatbotThemeColor', '#1E40AF');
    const chatbotTitle = await SystemConfigService.getConfig('chatbotTitle', 'Trợ lý AI');
    const chatbotWelcomeMessage = await SystemConfigService.getConfig('chatbotWelcomeMessage', 'Xin chào! Tôi có thể giúp gì cho bạn?');
    const chatbotPosition = await SystemConfigService.getConfig('chatbotPosition', 'bottom-right');

    res.render('admin/config', { 
      maxWorkingHours, maintenanceMode, holidays,
      chatbotEnabled, chatbotWebhookUrl, chatbotThemeColor, 
      chatbotTitle, chatbotWelcomeMessage, chatbotPosition
    });
  });
  updateConfig = asyncHandler(async (req, res) => {
    const { 
      maxWorkingHours, maintenanceMode, holidays,
      chatbotEnabled, chatbotWebhookUrl, chatbotThemeColor,
      chatbotTitle, chatbotWelcomeMessage, chatbotPosition
    } = req.body;
    
    await SystemConfigService.setConfig('maxWorkingHours', Number(maxWorkingHours) || 8, 'Giờ làm việc tối đa trong ngày');
    await SystemConfigService.setConfig('maintenanceMode', maintenanceMode === 'on', 'Chế độ bảo trì hệ thống');
    await SystemConfigService.setConfig('holidays', String(holidays || '').trim(), 'Danh sách ngày nghỉ lễ');
    
    await SystemConfigService.setConfig('chatbotEnabled', chatbotEnabled === 'on', 'Bật/tắt AI Chatbot');
    await SystemConfigService.setConfig('chatbotWebhookUrl', String(chatbotWebhookUrl || '').trim(), 'Webhook URL cho n8n Chatbot');
    await SystemConfigService.setConfig('chatbotThemeColor', String(chatbotThemeColor || '').trim(), 'Màu chủ đề AI Chatbot');
    await SystemConfigService.setConfig('chatbotTitle', String(chatbotTitle || '').trim(), 'Tiêu đề AI Chatbot');
    await SystemConfigService.setConfig('chatbotWelcomeMessage', String(chatbotWelcomeMessage || '').trim(), 'Tin nhắn chào mừng AI Chatbot');
    await SystemConfigService.setConfig('chatbotPosition', String(chatbotPosition || 'bottom-right').trim(), 'Vị trí AI Chatbot');

    await AuditService.log('UPDATE_CONFIG', req.user._id, `Cập nhật maxWorkingHours=${Number(maxWorkingHours)}, maintenanceMode=${maintenanceMode === 'on'}, chatbotEnabled=${chatbotEnabled === 'on'}`);
    
    req.flash('success', 'Cập nhật cấu hình hệ thống thành công.');
    res.redirect('/admin/config');
  });

  logsPage = asyncHandler(async (req, res) => {
    const logs = await AuditService.getRecentLogs(200);
    const formattedLogs = logs.map(log => ({
        ...log,
        createdAtStr: log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '--'
    }));
    res.render('admin/logs', { logs: formattedLogs });
  });

  toggleBanUser = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      req.flash('error', 'User not found.');
      return res.redirect('back');
    }
    
    if (String(targetUser._id) === String(req.user._id)) {
        req.flash('error', 'Không thể tự khóa tài khoản của chính mình.');
        return res.redirect('back');
    }

    targetUser.isBanned = !targetUser.isBanned;
    await targetUser.save();
    
    const action = targetUser.isBanned ? 'BAN_USER' : 'UNBAN_USER';
    await AuditService.log(action, req.user._id, `Tài khoản: ${targetUser.email}`, targetUser._id);
    
    req.flash('success', `Đã ${targetUser.isBanned ? 'khóa' : 'mở khóa'} tài khoản thành công.`);
    res.redirect('back');
  });
}

module.exports = new AdminController();
