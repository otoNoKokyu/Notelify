import { useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const useAuth = () => {
    const [user, setUser] = useState(authService.getProfile());

    useEffect(() => {
        // Initialize if not already exists
        if (!user) {
            const newUser = authService.initialize();
            setUser(newUser);
        }
    }, [user]);

    return {
        user,
        userId: user?.id,
        isNewUser: user ? (new Date() - new Date(user.joinedAt) < 5000) : false
    };
};
