import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { TodayMission } from '../types/index';

export class CustomMissionRepository {
  static async saveMission(userId: string, mission: TodayMission): Promise<void> {
    const missionRef = doc(db, 'users', userId, 'customMissions', mission.id);
    await setDoc(missionRef, mission);
  }

  static async getMissions(userId: string): Promise<TodayMission[]> {
    const querySnapshot = await getDocs(collection(db, 'users', userId, 'customMissions'));
    return querySnapshot.docs.map(doc => doc.data() as TodayMission);
  }

  static async deleteMission(userId: string, missionId: string): Promise<void> {
    const missionRef = doc(db, 'users', userId, 'customMissions', missionId);
    await deleteDoc(missionRef);
  }
}
