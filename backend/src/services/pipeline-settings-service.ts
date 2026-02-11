import PipelineSettings from "../models/pipeline-settings";

export async function savePipelineSettings(userId: string, settings: any) {
  let doc = await PipelineSettings.findOne({ userId });
  if (doc) {
    Object.assign(doc, settings);
    await doc.save();
    return doc;
  } else {
    doc = new PipelineSettings({ userId, ...settings });
    await doc.save();
    return doc;
  }
}

export async function getPipelineSettings(userId: string) {
  const settings = await PipelineSettings.findOne({ userId });
  return settings || null;
}
