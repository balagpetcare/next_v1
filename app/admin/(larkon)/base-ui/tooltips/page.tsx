import ComponentContainerCard from '@larkon/components/ComponentContainerCard'
import PageTItle from '@larkon/components/PageTItle'
import UIExamplesList from '@larkon/components/UIExamplesList'
import { colorVariants } from '@larkon/context/constants'
import type { Metadata } from 'next'
import { Button, Col, Container, OverlayTrigger, Row, Tooltip, type OverlayProps } from 'react-bootstrap'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Tooltips' }

const TooltipDirections = () => {
  const directions: OverlayProps['placement'][] = ['top', 'right', 'bottom', 'left']
  return (
    <ComponentContainerCard
      id="direction"
      title="Tooltip Direction"
      description={<>Four options are available: top, right, bottom, and left aligned.</>}>
      <div className="d-flex flex-wrap gap-3">
        {directions.map((direction, idx) => (
          <OverlayTrigger placement={direction} overlay={<Tooltip>Tooltip on {direction}</Tooltip>} key={idx}>
            <Button
              variant="primary"
              type="button"
              className="btn btn-primary"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              data-bs-title="Tooltip on top">
              Tooltip on {direction}
            </Button>
          </OverlayTrigger>
        ))}
      </div>
    </ComponentContainerCard>
  )
}

const ColorTooltip = () => {
  return (
    <ComponentContainerCard
      id="color_tooltip"
      title="Color Tooltip"
      description={
        <>
          We set a custom class with ex. <code>data-bs-custom-class=&quot;primary-tooltip&quot;</code> to scope our background-color primary
          appearance and use it to override a local CSS variable.
        </>
      }>
      <div className="d-flex flex-wrap gap-3">
        {colorVariants.slice(0, 4).map((color, idx) => (
          <OverlayTrigger key={idx} overlay={<Tooltip className={`${color}-tooltip`}>This top tooltip is themed via CSS variables.</Tooltip>}>
            <Button variant={color}>{color.charAt(0).toUpperCase() + color.slice(1)} tooltip</Button>
          </OverlayTrigger>
        ))}
      </div>
    </ComponentContainerCard>
  )
}

const Tooltips = () => {
  return (
    <>
      <PageTItle title="TOOLTIPS" />
      <Container>
        <Row>
          <Col xl={9}>
            <TooltipDirections />
            <ColorTooltip />
          </Col>
          <Col xl={3}>
            <UIExamplesList
              examples={[
                { link: '#direction', label: 'Direction' },
                { link: '#color_tooltip', label: 'Color Tooltip' },
              ]}
            />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Tooltips
