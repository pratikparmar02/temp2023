const fs = require("fs");
const { Client, LocalAuth, MessageMedia, Buttons } = require("whatsapp-web.js");

const qrcode = require("qrcode-terminal");
var mime = require("mime-types");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();
const axios = require("axios");
const request = require("request");
// Path where the session data will be stored
const SESSION_FILE_PATH = "./session.json";

const { isNullOrUndefined, isNull } = require("util");

// Load the session data if it has been previously saved
let sessionData;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionData = require(SESSION_FILE_PATH);
}

// Use the saved values
const client = new Client({
  authStrategy: new LocalAuth({
    session: sessionData,
  }),
  ffmpeg: "./ffmpeg",
  puppeteer: { executablePath: "/usr/bin/google-chrome-stable" },
});

// Save session values to the file upon successful auth
client.on("authenticated", (session) => {});

client.on("message", async (msg) => {
  if (msg.body === ".tagall") {
    const chat = await msg.getChat();

    let text = "Well Hello Everyone";
    let mentions = [];

    for (let participant of chat.participants) {
      const contact = await client.getContactById(participant.id._serialized);

      mentions.push(contact);
      //text += `@${participant.id.user} `;
    }

    await chat.sendMessage(text, { mentions });
  }
});

client.on("message", (message) => {
  if (message.body === ".s") {
    if (message.hasQuotedMsg) {
      const stickerMaker = message.getQuotedMessage();
      stickerMaker.then(function (quotedText) {
        //console.log("Quoted Text is :", tt);
        console.log(quotedText.body);
        //message.reply("Ruko Zara Sabar Karo!!!");
        if (quotedText.hasMedia || quotedText.isGif) {
          quotedText.downloadMedia().then((media) => {
            if (media) {
              const mediaPath = "./downloaded-media/";

              if (!fs.existsSync(mediaPath)) {
                fs.mkdirSync(mediaPath);
              }

              const extension = mime.extension(media.mimetype);

              const filename = new Date().getTime();

              const fullFilename = mediaPath + filename + "." + extension;

              // Save to file
              try {
                fs.writeFileSync(fullFilename, media.data, {
                  encoding: "base64",
                });
                console.log("File downloaded successfully!", fullFilename);
                console.log(fullFilename);
                MessageMedia.fromFilePath((filePath = fullFilename));
                client.sendMessage(
                  message.from,
                  new MessageMedia(media.mimetype, media.data, filename),
                  {
                    sendMediaAsSticker: true,
                    stickerAuthor: "Superman",
                    stickerName: "Stickers",
                  }
                );
                fs.unlinkSync(fullFilename);
                console.log(`File Deleted successfully!`);
              } catch (err) {
                console.log("Failed to save the file:", err);
                console.log(`File Deleted successfully!`);
              }
            }
          });
        } else {
          message.reply(
            "Tagged Msg is: " + quotedText.body + "\nPlease tag it to any media"
          );
        }
      });
    }
  }
});

const configuration = new Configuration({
  apiKey: process.env.SECRET_KEY,
});
const openai = new OpenAIApi(configuration);

async function runCompletion(message) {
  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: message,
    max_tokens: 200,
  });
  return completion.data.choices[0].text;
}

// client.on("message", (message) => {
//   if (message.body === ".ai") {
//     if (message.hasQuotedMsg) {
//       const gpt = message.getQuotedMessage();
//       gpt.then(function (quotedText) {
//         runCompletion(quotedText.body).then((result) => message.reply(result));
//       });
//     }
//   }
//   //console.log(message.body);
//   //runCompletion(message.body).then((result) => message.reply(result));
// });

client.on("message", (message) => {
  if (message.body === ".alive") {
    message.reply("Alive But Ded Inside");
  }
});

client.on("message", (message) => {
  if (message.body === ".fb") {
    if (message.hasQuotedMsg) {
      const fbvid = message.getQuotedMessage();
      fbvid.then(function (quotedText) {
        const options = {
          method: "GET",
          url: "https://facebook-reel-and-video-downloader.p.rapidapi.com/app/main.php",
          qs: {
            url: quotedText.body,
          },
          headers: {
            "X-RapidAPI-Key": process.env.D_KEY,
            "X-RapidAPI-Host":
              "facebook-reel-and-video-downloader.p.rapidapi.com",
          },
        };

        request(options, function (error, response, body) {
          if (error) throw new Error(error);

          //console.log(body);
          const obj = JSON.parse(body);

          const fs = require("fs");
          const https = require("https");

          function dl() {
            https.get(url, async (res) => {
              const mediaPath = "./downloaded-media/";
              if (!fs.existsSync(mediaPath)) {
                fs.mkdirSync(mediaPath);
              }

              const extension = "mp4";

              const filename = new Date().getTime();

              const fullFilename = mediaPath + filename + "." + extension;
              const filePath = await fs.createWriteStream(fullFilename);
              res.pipe(filePath);

              filePath.on("finish", () => {
                filePath.close();
                console.log("Download Completed");
              });

              async function sendMedia() {
                const { MessageMedia } = require("whatsapp-web.js");
                const media = MessageMedia.fromFilePath(fullFilename);
                await message.reply(media);
                fs.unlinkSync(fullFilename);
                console.log("media deleted");
              }

              setTimeout(sendMedia, 15000);
            });
          }

          if (body === "false") {
            message.reply("This link won't work");
          } else if (obj.success === false) {
            message.reply("Not a link");
          } else if (obj.links["Download High Quality"] === undefined) {
            message.reply("Downloading SD video...");
            url = obj.links["Download Low Quality"];
            dl(url);
          } else {
            console.log("Downloading HD Video....");
            url = obj.links["Download High Quality"];
            dl(url);
          }
        });
      });
    }
  }
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.initialize();
