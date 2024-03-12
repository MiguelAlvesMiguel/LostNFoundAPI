// Middleware to check if the user is authenticated
const checkAuth = async (req, res, next) => {
    const idToken = req.headers.authorization;
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      if (decodedToken) {
        req.user = decodedToken;
        return next();
      }
    } catch (error) {
      return res.status(401).send({ message: 'You are not authorized to access this resource.' });
    }
  };
  