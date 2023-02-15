import { useState } from 'react';
import ScrollableList from './ScrollableList.js';
import PaginatedList from './PaginatedList.js';
import './css/App.css';

export default function App() {
  const [ List, setListType ] = useState(() => ScrollableList);  
  const url = './FoodData_Central_foundation_food_json_2022-10-28.json';
  return (
    <div className="App">
      <div className="top-bar">
        <button onClick={() => setListType(() => ScrollableList)} >Continuous scroll</button>
        <button onClick={() => setListType(() => PaginatedList)}>Pagination</button>
      </div>
      <div className="content-area">
        <List url={url} />
      </div>
    </div>
  );
}
