/* Built-in exercise library, grouped by muscle group */

export const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core', 'Full body', 'Cardio', 'Other'];

// Increase this number when you add exercises below, so existing users get them too
export const LIBRARY_VERSION = 1;

const RAW = {
  Chest: [
    'Bench Press', 'Incline Bench Press', 'Decline Bench Press', 'Dumbbell Bench Press',
    'Incline Dumbbell Press', 'Chest Press Machine', 'Cable Fly', 'Dumbbell Fly', 'Pec Deck', 'Push Up', 'Dip',
  ],
  Back: [
    'Deadlift', 'Barbell Row', 'Dumbbell Row', 'Seated Cable Row', 'T-Bar Row', 'Pull Up', 'Chin Up',
    'Lat Pulldown', 'Close Grip Lat Pulldown', 'Straight Arm Pulldown', 'Back Extension', 'Shrug',
  ],
  Shoulders: [
    'Overhead Press', 'Dumbbell Shoulder Press', 'Arnold Press', 'Shoulder Press Machine', 'Lateral Raise',
    'Cable Lateral Raise', 'Front Raise', 'Rear Delt Fly', 'Face Pull', 'Upright Row',
  ],
  Arms: [
    'Bicep Curl', 'Barbell Curl', 'Hammer Curl', 'Preacher Curl', 'Cable Curl', 'Incline Dumbbell Curl',
    'Tricep Pushdown', 'Overhead Tricep Extension', 'Skull Crusher', 'Close Grip Bench Press', 'Wrist Curl',
  ],
  Legs: [
    'Squat', 'Front Squat', 'Goblet Squat', 'Hack Squat', 'Leg Press', 'Bulgarian Split Squat', 'Lunge',
    'Walking Lunge', 'Step Up', 'Leg Extension', 'Leg Curl', 'Seated Leg Curl', 'Romanian Deadlift',
    'Hip Adduction', 'Calf Raise', 'Seated Calf Raise',
  ],
  Glutes: ['Hip Thrust', 'Glute Bridge', 'Cable Kickback', 'Hip Abduction', 'Sumo Deadlift'],
  Core: [
    'Plank', 'Side Plank', 'Crunch', 'Cable Crunch', 'Hanging Leg Raise', 'Russian Twist', 'Ab Wheel',
    'Mountain Climber',
  ],
  'Full body': ['Kettlebell Swing', 'Clean and Press', 'Thruster', 'Burpee', 'Farmer Carry', 'Sled Push'],
  Cardio: [
    'Treadmill', 'Running (outdoor)', 'Walking', 'Incline Walk', 'Cycling', 'Stationary Bike',
    'Spin Bike', 'Rowing Machine', 'Elliptical', 'Stair Climber', 'Swimming', 'Jump Rope', 'SkiErg',
  ],
};

export const LIBRARY = Object.entries(RAW).flatMap(([muscle, names]) =>
  names.map((name) => ({ name, muscle, type: muscle === 'Cardio' ? 'cardio' : 'strength' }))
);

const BY_NAME = new Map(LIBRARY.map((x) => [x.name.toLowerCase(), x]));
export const libraryInfo = (name) => BY_NAME.get(String(name).toLowerCase());