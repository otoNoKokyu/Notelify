import { v4 as uuidv4 } from 'uuid';

const AUTH_KEY = 'reflect_user_profile';

export const authService = {
    getProfile() {
        const stored = localStorage.getItem(AUTH_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse user profile", e);
            }
        }
        return null;
    },

    initialize() {
        let profile = this.getProfile();
        if (!profile) {
            profile = {
                id: uuidv4(),
                joinedAt: new Date().toISOString(),
                lastSeenAt: new Date().toISOString(),
                version: '1.0'
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(profile));
            // Maintain compatibility with existing code using 'user_id' key
            localStorage.setItem('user_id', profile.id);
        } else {
            profile.lastSeenAt = new Date().toISOString();
            localStorage.setItem(AUTH_KEY, JSON.stringify(profile));
        }
        return profile;
    },

    getUserId() {
        const profile = this.getProfile();
        return profile ? profile.id : localStorage.getItem('user_id');
    }
};

export const getUserId = () => authService.getUserId();
