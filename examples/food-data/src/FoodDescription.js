import { memo } from 'react';

const FoodDescription = memo(({ info }) => {
  const { description, foodNutrients = [] } = info;
  return (
    <li className="FoodDescription">
      <h2>{description}</h2>
      <ul>
        {foodNutrients.map(({ amount, nutrient }, index) => {
          const { name, unitName } = nutrient;
          return <li key={index}>{name} - {amount}{unitName}</li>
        })}
      </ul>
    </li>
  );
});

export default FoodDescription;