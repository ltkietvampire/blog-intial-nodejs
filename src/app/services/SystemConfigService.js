const SystemConfig = require('../model/SystemConfig');

class SystemConfigService {
  async getConfig(key, defaultValue) {
    const config = await SystemConfig.findOne({ key }).lean();
    if (config) {
      return config.value;
    }
    return defaultValue;
  }

  async setConfig(key, value, description = '') {
    await SystemConfig.findOneAndUpdate(
      { key },
      { value, description },
      { upsert: true, new: true }
    );
  }

  async getAllConfigs() {
    return await SystemConfig.find({}).lean();
  }
}

module.exports = new SystemConfigService();
