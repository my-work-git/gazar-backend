import fs from 'fs';
import path from 'path';
import mjml2html from 'mjml';
import handlebars from 'handlebars';

export const MjmlToHTML = (templatePath) => new Promise((resolve, reject) => {
  fs.readFile(templatePath, (err, buffer) => err ? reject(err) : resolve(mjml2html(buffer.toString()).html));
});

export const ProcessEmailTemplate = async (templateName, context = {}) => {
  const finalPath = path.join(__dirname, `${templateName}.mjml`);
  const htmlText = await MjmlToHTML(finalPath);
  return handlebars.compile(htmlText)(context);
};
