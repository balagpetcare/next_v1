'use client'
import UIExamplesList from '@larkon/components/UIExamplesList'
import { Col, Container, Row } from 'react-bootstrap'
import { ActiveItems, Basic, CheckboxesAndRadiosListGroup, ContextualListGroup, CustomContentListGroup, DisabledItems, FlushListGroup, HorizontalListGroup, LinksButtons, NumberedListGroup } from './ListGroup'

const AllListGroup = () => {
  return (
    <>
      <Container>
        <Row>
          <Col xl={9}>
            <Basic />
            <ActiveItems />
            <DisabledItems />
            <LinksButtons />
            <FlushListGroup />
            <NumberedListGroup />
            <HorizontalListGroup />
            <ContextualListGroup />
            <CustomContentListGroup />
            <CheckboxesAndRadiosListGroup />
          </Col>

          <Col xl={3}>
            <UIExamplesList
              examples={[
                { link: '#basic', label: 'Basic' },
                { link: '#active', label: 'Active items' },
                { link: '#disabled', label: 'Disabled items' },
                { link: '#links-buttons', label: 'Links and buttons' },
                { link: '#flush', label: 'Flush' },
                { link: '#numbered', label: 'Numbered' },
                { link: '#horizontal', label: 'Horizontal' },
                { link: '#contextual-classes', label: 'Contextual classes' },
                { link: '#custom-content', label: 'Custom content' },
                { link: '#checkboxes-radios', label: 'Checkboxes and Radios' },
              ]}
            />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default AllListGroup
