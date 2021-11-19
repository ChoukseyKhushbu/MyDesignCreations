var axios = require("axios");

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      if (req.body && req.body.code) {
        const response = await axios.post(
          `https://dribbble.com/oauth/token?client_id=${process.env.NEXT_PUBLIC_CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&code=${req.body.code}`
        );
        res.status(200).json({
          accessToken: response.data.access_token,
          error: null,
        });
      } else {
        throw new Error("Bad credentials.");
      }
    }
  } catch (error) {
    res.status(200).json({
      accessToken: null,
      error: error.message,
    });
  }
}
