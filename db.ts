import { createClient } from "@supabase/supabase-js";
import { UserDBRecord, SignalHistory, SystemNotification, DashboardAnalytics } from "./types.js";

let supabaseClient: any = null;

// Lazy initialization pattern to ensure the application won't crash on startup
export function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase credentials (SUPABASE_URL and SUPABASE_ANON_KEY) are missing in environment variables. Please check your .env/settings configurations."
      );
    }
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      }
    });
  }
  return supabaseClient;
}

export class FireSignalDB {
  static async getUserByEmail(email: string): Promise<UserDBRecord | undefined> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("email", email.trim())
        .maybeSingle();

      if (error) {
        console.error("Supabase read error in getUserByEmail:", error);
        throw new Error("Failed to query user from database. " + error.message);
      }
      return data || undefined;
    } catch (e) {
      console.error("Error in getUserByEmail:", e);
      throw e;
    }
  }

  static async getUserById(id: string): Promise<UserDBRecord | undefined> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Supabase read error in getUserById:", error);
        throw new Error("Failed to find user in database. " + error.message);
      }
      return data || undefined;
    } catch (e) {
      console.error("Error in getUserById:", e);
      throw e;
    }
  }

  static async getUsers(): Promise<UserDBRecord[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("registrationDate", { ascending: false });

      if (error) {
        console.error("Supabase read error in getUsers:", error);
        throw new Error("Failed to retrieve user directory. " + error.message);
      }
      return data || [];
    } catch (e) {
      console.error("Error in getUsers:", e);
      throw e;
    }
  }

  static async addUser(user: UserDBRecord): Promise<void> {
    try {
      const supabase = getSupabase();
      
      // Auto-validate status for admin override accounts
      const lowerEmail = user.email.toLowerCase();
      const isFirstOrAdmin = lowerEmail === "fardinahmed9592@gmail.com" || lowerEmail === "fardinahmed9592@gmai.com";
      
      // New users default to inactive as requested: "New users should be created with status = 'inactive'"
      user.status = isFirstOrAdmin ? "Active" : "Inactive";
      user.isAdmin = isFirstOrAdmin;
      user.has_access = isFirstOrAdmin;

      const { error } = await supabase
        .from("users")
        .insert([user]);

      if (error) {
        console.error("Supabase write error in addUser:", error);
        throw new Error("Failed to save profile to database: " + error.message);
      }
    } catch (e) {
      console.error("Error in addUser:", e);
      throw e;
    }
  }

  static async updateUser(id: string, updates: Partial<UserDBRecord>): Promise<void> {
    try {
      const supabase = getSupabase();
      
      // If we are changing email, check admin override constraint
      if (updates.email) {
        const lowerEmail = updates.email.toLowerCase();
        if (lowerEmail === "fardinahmed9592@gmail.com" || lowerEmail === "fardinahmed9592@gmai.com") {
          updates.isAdmin = true;
          updates.status = "Active";
          updates.has_access = true;
        }
      }

      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", id);

      if (error) {
        console.error("Supabase write error in updateUser:", error);
        throw new Error("Failed to update user profile: " + error.message);
      }
    } catch (e) {
      console.error("Error in updateUser:", e);
      throw e;
    }
  }

  static async deleteUser(id: string): Promise<void> {
    try {
      const supabase = getSupabase();
      // Notice: CASCADE deletion is configured in database, but we can do it explicitly as well
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Supabase delete error in deleteUser:", error);
        throw new Error("Failed to delete user profile from database. " + error.message);
      }
    } catch (e) {
      console.error("Error in deleteUser:", e);
      throw e;
    }
  }

  static async getSignals(userId?: string): Promise<SignalHistory[]> {
    try {
      const supabase = getSupabase();
      let query = supabase.from("signals").select("*");
      if (userId) {
        query = query.eq("userId", userId);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error("Supabase read error in getSignals:", error);
        throw new Error("Failed to retrieve signal analytics. " + error.message);
      }
      return data || [];
    } catch (e) {
      console.error("Error in getSignals:", e);
      throw e;
    }
  }

  static async addSignal(signal: SignalHistory): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("signals")
        .insert([signal]);

      if (error) {
        console.error("Supabase write error in addSignal:", error);
        throw new Error("Failed to save signal metrics in Supabase: " + error.message);
      }
    } catch (e) {
      console.error("Error in addSignal:", e);
      throw e;
    }
  }

  static async getNotifications(userId: string): Promise<SystemNotification[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("userId", userId)
        .order("date", { ascending: false });

      if (error) {
        console.error("Supabase read error in getNotifications:", error);
        throw new Error("Failed to fetch inbox notifications. " + error.message);
      }
      return data || [];
    } catch (e) {
      console.error("Error in getNotifications:", e);
      throw e;
    }
  }

  static async addNotification(userId: string, title: string, message: string, type: SystemNotification["type"]): Promise<void> {
    try {
      const supabase = getSupabase();
      const notif: SystemNotification = {
        id: "not_" + Math.random().toString(36).substr(2, 9),
        userId,
        title,
        message,
        type,
        date: new Date().toISOString(),
        read: false
      };
      
      const { error } = await supabase
        .from("notifications")
        .insert([notif]);

      if (error) {
        console.error("Supabase write error in addNotification:", error);
        throw new Error("Failed to create message template: " + error.message);
      }
    } catch (e) {
      console.error("Error in addNotification:", e);
      throw e;
    }
  }

  static async markNotificationsAsRead(userId: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("userId", userId);

      if (error) {
        console.error("Supabase write error in markNotificationsAsRead:", error);
        throw new Error("Failed to clear notifications: " + error.message);
      }
    } catch (e) {
      console.error("Error in markNotificationsAsRead:", e);
      throw e;
    }
  }

  static async getAnalytics(): Promise<DashboardAnalytics> {
    try {
      const users = await this.getUsers();
      const signals = await this.getSignals();

      const approved = users.filter(u => u.status === "approved" || u.status === "Active").length;
      const pending = users.filter(u => u.status === "pending" || u.status === "Inactive").length;
      const totalSignals = signals.length;

      const oneDayAgo = Date.now() - 24 * 3600 * 1000;
      const dailySignals = signals.filter(s => {
        const sigDate = new Date(`${s.date}T00:00:00Z`).getTime();
        return sigDate >= oneDayAgo;
      }).length;

      const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
      const monthlySignals = signals.filter(s => {
        const sigDate = new Date(`${s.date}T00:00:00Z`).getTime();
        return sigDate >= thirtyDaysAgo;
      }).length;

      return {
        totalUsers: users.length,
        approvedUsers: approved,
        pendingUsers: pending,
        totalSignalRequests: totalSignals,
        dailySignalRequests: dailySignals || totalSignals,
        monthlySignalRequests: monthlySignals || totalSignals
      };
    } catch (e) {
      console.error("Error in getAnalytics:", e);
      throw e;
    }
  }
}
