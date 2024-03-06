app.post('/users', (req, res) => {
    const user = req.body; // In a real app, you'd validate and store this
  
    // Fake implementation for demonstration
    if (!user.username || !user.email) {
      return res.status(400).send({ message: 'Invalid input' });
    }
  
    // Again, in a real app, you'd probably save the user to a database
    console.log('User registered:', user);
    res.status(201).send({ message: 'User created successfully' });
  });
  