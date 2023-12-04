// @ts-nocheck
import React, { useState, useEffect } from 'react';
import Modal from './Modal'; // モーダルコンポーネントのインポート
import ClassDetailsModal from './ClassDetailsModal'; // モーダルコンポーネントのインポート
import './TimeTable.css';
import './Modal.css';
import './ClassDetailsModal.css';


const TimeTable = () => {
    // 曜日のリスト
    const days = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日'];

    const dayMapping = {
        '月曜日': 1,
        '火曜日': 2,
        '水曜日': 3,
        '木曜日': 4,
        '金曜日': 5
    };
      
    const periodMapping = {
      '1時間目': 1,
      '2時間目': 2,
      '3時間目': 3,
      '4時間目': 4,
      '5時間目': 5,
      '6時間目': 6
    };

    const timeSlots = {
      '1時間目': '08:50~ 10:20',
      '2時間目': '10:30~ 12:00',
      '3時間目': '13:00~ 14:30',
      '4時間目': '14:40~ 16:10',
      '5時間目': '16:20~ 17:50',
      '6時間目': '18:00~ 19:30'
    };

    // 特定の曜日と時間帯に対応する授業を検索する関数
    const renderSchedule = (day, period) => {
      if (!Array.isArray(schedule)) {
        return '';
      }
    
      const classInfo = schedule.find(c => c.day === day && c.period === period);
      if (!classInfo) {
        return '';
      }

      const handleClassInfoClick = (e) => {
        e.stopPropagation(); // イベントの伝播を停止
        handleCellClick(day, period, classInfo);
      };
    
      return (
        <div onClick={handleClassInfoClick}>
          <div className="class-name-timetable">{classInfo.name}</div>
          <div className="class-room">{classInfo.building} {classInfo.room_id}</div>
        </div>
      );
    };
      
    const [schedule, setSchedule] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);

    const showClassDetails = (classInfo) => {
      setSelectedClass(classInfo);
    };

    const closeClassDetails = () => {
      setSelectedClass(null);
    };

    const handleCellClick = async (day, period, classInfo) => {
        if (classInfo) {
          // 授業の詳細情報を表示するロジック
          showClassDetails(classInfo);
        } else {
          const dayNumber = dayMapping[day];
          const periodNumber = periodMapping[period];
        
          const classesForDayAndPeriod = await fetchClassesForDayAndPeriod(dayNumber, periodNumber);
          setCurrentClasses(classesForDayAndPeriod);
          setModalShow(true);
        }
      };

    const fetchClassesForDayAndPeriod = async (dayNumber, periodNumber) => {
        try {
          const response = await fetch(`https://api.ayutaso.com/classes/${dayNumber}/${periodNumber}`);
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return await response.json();
        } catch (error) {
          console.error('Error fetching classes:', error);
          return [];
        }
      };

    const dbName = "TimeTableDB";
    const storeName = "classes";

    const openDB = async () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = event => {
        const db = event.target.result;
        db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
        };

        request.onsuccess = event => {
        resolve(event.target.result);
        };

        request.onerror = event => {
        reject("IndexedDB opening error: ", event.target.errorCode);
        };
    });
    };

    const saveClass = async (data) => {
    const db = await openDB();
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.add(data);
    };

    const loadClasses = async () => {
        const db = await openDB();
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const allClasses = await store.getAll();
        //console.log("Loaded classes from IndexedDB:", allClasses);
        return allClasses;
      };

    useEffect(() => {
        const loadAndSetSchedule = async () => {
          const loadedSchedule = await loadClasses();
          loadedSchedule.onsuccess = () => {
            setSchedule(loadedSchedule.result);
          }
        };
      
        loadAndSetSchedule();
      }, []);

    const [modalShow, setModalShow] = useState(false);
    const [currentClasses, setCurrentClasses] = useState([]);

    const deleteClass = async (classInfo) => {
      const db = await openDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      await store.delete(classInfo.id);
    
      // スケジュールからも削除
      setSchedule(prevSchedule => prevSchedule.filter(c => c.id !== classInfo.id));
    };
  
    const handleClassSelect = async (classInfo) => {
        // モーダルを閉じる
        setModalShow(false);
      
        // classInfo の内容を確認（デバッグ用）
        console.log("Selected Class: ", classInfo);
      
        // day と period を曜日と時間帯の文字列に変換
        const dayString = Object.keys(dayMapping).find(key => dayMapping[key] === classInfo.day);
        const periodString = Object.keys(periodMapping).find(key => periodMapping[key] === classInfo.period);
      
        // 更新する授業情報を作成
        const updatedClassInfo = {
          ...classInfo,
          day: dayString,
          period: periodString
        };

        console.log("updatedClassInfo: ", updatedClassInfo);
      
        try {
          // 更新された授業情報をIndexedDBに保存
          await saveClass(updatedClassInfo);
      
          // 現在のスケジュールに更新された授業を追加して、UIを更新
          setSchedule(prevSchedule => {
            // prevSchedule が配列であることを確認
            if (Array.isArray(prevSchedule)) {
              return [...prevSchedule, updatedClassInfo];
            } else {
              // prevSchedule が配列でない場合、新しい配列を返す
              console.log("elseだよ", prevSchedule);
              return [updatedClassInfo];
            }
          });

          console.log("schedule1: ", schedule);
        } catch (error) {
          console.error("Error saving class to IndexedDB:", error);
        }
      };

  return (
    <div className="TimeTable">
      <ClassDetailsModal
        classInfo={selectedClass}
        onClose={closeClassDetails}
        onDelete={deleteClass}
      />
      <Modal
        show={modalShow}
        classes={currentClasses}
        onSelect={handleClassSelect}
        onClose={() => setModalShow(false)}
      />
      <table>
        <thead>
        <tr>
            <th>時間\曜日</th>
            {days.map(day => <th key={day}>{day}</th>)}
        </tr>
        </thead>
        <tbody>
          {Object.entries(timeSlots).map(([period, time]) => (
              <tr key={period}>
                <td>{`${period} ${time}`}</td>
            {days.map(day => (
                <td key={day} onClick={() => handleCellClick(day, period)}>
                {renderSchedule(day, period)}
                </td>
            ))}
            </tr>
        ))}
        </tbody>
    </table>
    </div>
  );
};

export default TimeTable;
